// ═══════════════════════════════════════════════════════════════
// Sync Service — Server-Side Sync Arbitration
// Maintains authoritative playback state per room in Redis
// ═══════════════════════════════════════════════════════════════

import { getJson, setJson } from '../redis/client';
import { REDIS_KEYS } from '../config';
import { createInitialSyncState, type SyncState, SYNC_CONSTANTS, type SyncCorrection } from '@anisync/shared';
import { getDb } from '../db/client';

// ─── Room Sync State Management ───────────────────────────────

export async function getRoomState(roomId: string): Promise<SyncState> {
  const cached = await getJson<SyncState>(REDIS_KEYS.roomState(roomId));
  return cached ?? createInitialSyncState();
}

export async function updateRoomState(roomId: string, updates: Partial<SyncState>): Promise<SyncState> {
  const current = await getRoomState(roomId);
  const updated: SyncState = { ...current, ...updates, lastEventAt: Date.now() };
  await setJson(REDIS_KEYS.roomState(roomId), updated, 86400); // 24h TTL
  return updated;
}

// ─── Sync Event Processing ────────────────────────────────────

export async function processPlayEvent(
  roomId: string, userId: string, time: number, generation: number
): Promise<{ state: SyncState; generation: number } | null> {
  const state = await getRoomState(roomId);
  if (!await isAuthorized(roomId, userId, state)) return null;
  if (generation <= state.generation) return null;

  const newGen = state.generation + 1;
  const updated = await updateRoomState(roomId, {
    isPlaying: true, currentTime: time, generation: newGen,
  });
  return { state: updated, generation: newGen };
}

export async function processPauseEvent(
  roomId: string, userId: string, time: number, generation: number
): Promise<{ state: SyncState; generation: number } | null> {
  const state = await getRoomState(roomId);
  if (!await isAuthorized(roomId, userId, state)) return null;
  if (generation <= state.generation) return null;

  const newGen = state.generation + 1;
  const updated = await updateRoomState(roomId, {
    isPlaying: false, currentTime: time, generation: newGen,
  });
  return { state: updated, generation: newGen };
}

export async function processSeekEvent(
  roomId: string, userId: string, time: number, generation: number
): Promise<{ state: SyncState; generation: number } | null> {
  const state = await getRoomState(roomId);
  if (!await isAuthorized(roomId, userId, state)) return null;
  if (generation <= state.generation) return null;

  const newGen = state.generation + 1;
  const updated = await updateRoomState(roomId, {
    currentTime: time, generation: newGen,
  });
  return { state: updated, generation: newGen };
}

export async function processSpeedEvent(
  roomId: string, userId: string, speed: number, generation: number
): Promise<{ state: SyncState; generation: number } | null> {
  const state = await getRoomState(roomId);
  if (!await isAuthorized(roomId, userId, state)) return null;
  if (generation <= state.generation) return null;

  const newGen = state.generation + 1;
  const updated = await updateRoomState(roomId, {
    playbackSpeed: speed, generation: newGen,
  });
  return { state: updated, generation: newGen };
}

export async function processEpisodeChange(
  roomId: string, userId: string, anime: SyncState['anime']
): Promise<SyncState | null> {
  const state = await getRoomState(roomId);
  if (!await isAuthorized(roomId, userId, state)) return null;

  const updated = await updateRoomState(roomId, {
    anime, currentTime: 0, isPlaying: false,
    generation: state.generation + 1,
  });

  // Update room record
  await getDb().room.update({
    where: { id: roomId },
    data: { currentAnime: anime ? JSON.parse(JSON.stringify(anime)) : null, lastActiveAt: new Date() },
  });

  return updated;
}

// ─── Drift Detection ──────────────────────────────────────────

export async function checkAndCorrectDrift(
  roomId: string, _userId: string, reportedTime: number, isPlaying: boolean
): Promise<SyncCorrection | null> {
  const state = await getRoomState(roomId);
  if (!state.isPlaying && !isPlaying) return null;

  // Calculate expected time
  const now = Date.now();
  let expectedTime = state.currentTime;
  if (state.isPlaying) {
    const elapsed = (now - state.lastEventAt) / 1000;
    expectedTime += elapsed * state.playbackSpeed;
  }

  const driftMs = Math.abs(reportedTime - expectedTime) * 1000;

  if (driftMs > SYNC_CONSTANTS.MAX_DRIFT_MS) {
    const newGen = state.generation + 1;
    await updateRoomState(roomId, { generation: newGen, currentTime: expectedTime });

    return {
      targetTime: expectedTime,
      isPlaying: state.isPlaying,
      speed: state.playbackSpeed,
      generation: newGen,
      reason: 'drift',
    };
  }

  return null;
}

// ─── Buffering Coordination ───────────────────────────────────

const bufferingUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>

export function setBuffering(roomId: string, userId: string, isBuffering: boolean): string[] {
  if (!bufferingUsers.has(roomId)) bufferingUsers.set(roomId, new Set());
  const set = bufferingUsers.get(roomId)!;

  if (isBuffering) {
    set.add(userId);
  } else {
    set.delete(userId);
    if (set.size === 0) bufferingUsers.delete(roomId);
  }

  return Array.from(set);
}

export function getBufferingUsers(roomId: string): string[] {
  return Array.from(bufferingUsers.get(roomId) ?? []);
}

// ─── Authorization ────────────────────────────────────────────

async function isAuthorized(_roomId: string, _userId: string, _state: SyncState): Promise<boolean> {
  // ALLOW ANYONE TO CONTROL THE ROOM
  // The user requested that mobile users (even guests) should be able to control the video.
  return true;
}

// ─── Late Join ────────────────────────────────────────────────

export async function getLateJoinState(roomId: string): Promise<SyncState> {
  const state = await getRoomState(roomId);

  if (state.isPlaying) {
    // Calculate current time accounting for elapsed time
    const elapsed = (Date.now() - state.lastEventAt) / 1000;
    return { ...state, currentTime: state.currentTime + elapsed * state.playbackSpeed };
  }

  return state;
}
