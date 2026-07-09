// ═══════════════════════════════════════════════════════════════
// Sync Manager — Orchestrates Player Control + Sync Engine + Socket
// The bridge between the video player and the sync system
// ═══════════════════════════════════════════════════════════════

import { SyncEngine, ClockSync, SYNC_CONSTANTS } from '@anisync/shared';
import { getSocket, getClockOffset } from './socket';
import { useSyncStore, useAuthStore, useRoomStore } from '../stores';

export class SyncManager {
  private engine: SyncEngine;
  private clock: ClockSync;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private driftCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessingRemote = false;
  private roomId: string;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.engine = new SyncEngine(userId, {
      isHost: useRoomStore.getState().currentRoom?.hostId === userId,
    });
    this.clock = new ClockSync();
  }

  /** Start heartbeat and drift correction loops */
  start(): void {
    this.startHeartbeat();
    this.startDriftCheck();
    this.setupSyncListeners();
    console.log('[SyncManager] Started for room:', this.roomId);
  }

  /** Stop all timers and cleanup */
  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.driftCheckTimer) clearInterval(this.driftCheckTimer);
    this.heartbeatTimer = null;
    this.driftCheckTimer = null;
    console.log('[SyncManager] Stopped');
  }

  /** Initialize with late-join state from server */
  initWithState(state: import('@anisync/shared').SyncState): void {
    this.engine.setState(state);
    useSyncStore.getState().setSyncState(state);
  }

  // ─── Local Player Events (user clicks play/pause/seek) ──────

  /** Call this when the LOCAL user clicks play */
  async onLocalPlay(currentTime: number): Promise<void> {
    this.engine.suppress(300);
    const gen = this.engine.nextGeneration();
    const socket = getSocket();
    socket?.emit('sync:play', {
      roomId: this.roomId,
      time: currentTime,
      generation: gen,
    });
  }

  /** Call this when the LOCAL user clicks pause */
  async onLocalPause(currentTime: number): Promise<void> {
    this.engine.suppress(300);
    const gen = this.engine.nextGeneration();
    const socket = getSocket();
    socket?.emit('sync:pause', {
      roomId: this.roomId,
      time: currentTime,
      generation: gen,
    });
  }

  /** Call this when the LOCAL user seeks */
  async onLocalSeek(targetTime: number): Promise<void> {
    this.engine.suppress(500);
    const gen = this.engine.nextGeneration();
    const socket = getSocket();
    socket?.emit('sync:seek', {
      roomId: this.roomId,
      time: targetTime,
      generation: gen,
    });
  }

  /** Call this when the LOCAL user changes speed */
  async onLocalSpeedChange(speed: number): Promise<void> {
    this.engine.suppress(300);
    const gen = this.engine.nextGeneration();
    const socket = getSocket();
    socket?.emit('sync:speed', {
      roomId: this.roomId,
      time: 0,
      generation: gen,
      speed,
    });
  }

  // ─── Remote Sync Events (from server) ───────────────────────

  /** Process a remote sync event — returns the player action to take */
  processRemoteEvent(
    type: string,
    originUserId: string,
    generation: number,
    time: number,
    serverTimestamp: number,
    metadata?: Record<string, unknown>
  ): { action: string; time?: number; speed?: number } | null {
    if (this.isProcessingRemote) return null;
    this.isProcessingRemote = true;

    try {
      const result = this.engine.processEvent(
        type, originUserId, generation, time, serverTimestamp, this.clock, metadata
      );

      if (result.type === 'none') return null;

      // Execute the player action
      this.executePlayerAction(result);

      return result;
    } finally {
      this.isProcessingRemote = false;
    }
  }

  /** Process a drift correction from server */
  processCorrection(correction: import('@anisync/shared').SyncCorrection): void {
    const action = this.engine.processCorrection(correction);
    this.executePlayerAction(action);
  }

  // ─── Player Execution ──────────────────────────────────────

  private async executePlayerAction(action: import('@anisync/shared').SyncAction): Promise<void> {
    const api = window.anisync;
    if (!api) return;

    switch (action.type) {
      case 'play':
        await api.player.seek(action.time);
        await api.player.play();
        break;
      case 'pause':
        await api.player.pause();
        if (action.time !== undefined) await api.player.seek(action.time);
        break;
      case 'seek':
        await api.player.seek(action.time);
        break;
      case 'speed':
        await api.player.setSpeed(action.speed);
        break;
      case 'correction':
        await api.player.seek(action.correction.targetTime);
        if (action.correction.isPlaying) {
          await api.player.play();
        } else {
          await api.player.pause();
        }
        await api.player.setSpeed(action.correction.speed);
        break;
    }
  }

  // ─── Heartbeat ──────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      const socket = getSocket();
      const api = window.anisync;
      if (!socket?.connected || !api) return;

      const playerState = await api.player.getState();
      if (!playerState) return;

      socket.emit('sync:heartbeat', {
        roomId: this.roomId,
        currentTime: playerState.time,
        isPlaying: playerState.state === 'playing',
        isBuffering: playerState.state === 'buffering',
        playbackSpeed: playerState.speed,
      });
    }, SYNC_CONSTANTS.HEARTBEAT_INTERVAL_MS);
  }

  // ─── Drift Check ───────────────────────────────────────────

  private startDriftCheck(): void {
    this.driftCheckTimer = setInterval(async () => {
      const api = window.anisync;
      if (!api) return;

      const playerState = await api.player.getState();
      if (!playerState) return;

      const serverNow = Date.now() + getClockOffset();
      const expectedTime = this.engine.getExpectedTime(serverNow);
      const drift = this.engine.checkDrift(playerState.time, expectedTime);

      if (drift) {
        useSyncStore.getState().setDrift(drift.driftMs);
      } else {
        useSyncStore.getState().setDrift(0);
      }
    }, SYNC_CONSTANTS.DRIFT_CHECK_INTERVAL_MS);
  }

  // ─── Socket Listeners ──────────────────────────────────────

  private setupSyncListeners(): void {
    const socket = getSocket();
    if (!socket) return;

    socket.on('sync:play', (data) => {
      this.processRemoteEvent('play', data.originUserId, data.generation, data.time, data.serverTimestamp);
    });

    socket.on('sync:pause', (data) => {
      this.processRemoteEvent('pause', data.originUserId, data.generation, data.time, data.serverTimestamp);
    });

    socket.on('sync:seek', (data) => {
      this.processRemoteEvent('seek', data.originUserId, data.generation, data.time, data.serverTimestamp);
    });

    socket.on('sync:speed', (data) => {
      this.processRemoteEvent('speed', data.originUserId, data.generation, data.time, data.serverTimestamp, { speed: data.speed });
    });

    socket.on('sync:correction', (data) => {
      this.processCorrection(data);
    });

    socket.on('sync:state-update', (data) => {
      this.engine.setState(data);
      useSyncStore.getState().setSyncState(data);
    });
  }
}

// ─── Singleton Manager ────────────────────────────────────────

let activeSyncManager: SyncManager | null = null;

export function createSyncManager(roomId: string): SyncManager {
  if (activeSyncManager) {
    activeSyncManager.stop();
  }
  const userId = useAuthStore.getState().user?.id ?? '';
  activeSyncManager = new SyncManager(roomId, userId);
  return activeSyncManager;
}

export function getSyncManager(): SyncManager | null {
  return activeSyncManager;
}

export function destroySyncManager(): void {
  activeSyncManager?.stop();
  activeSyncManager = null;
}
