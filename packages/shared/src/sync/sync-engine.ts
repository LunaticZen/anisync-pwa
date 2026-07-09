// ═══════════════════════════════════════════════════════════════
// @anisync/shared — Deterministic Sync Engine
// Core synchronization algorithm shared between client and server
// ═══════════════════════════════════════════════════════════════

import { SYNC_CONSTANTS, type SyncState, type SyncCorrection, type DriftReport } from '../types';

// ─── NTP-Style Clock Synchronization ──────────────────────────

export interface NtpSample {
  clientSendTime: number;
  serverTime: number;
  clientReceiveTime: number;
  roundTripTime: number;
  offset: number;
}

export class ClockSync {
  private samples: NtpSample[] = [];
  private _offset = 0;
  private _rtt = 0;
  private readonly maxSamples: number;

  constructor(maxSamples: number = SYNC_CONSTANTS.NTP_SAMPLE_COUNT) {
    this.maxSamples = maxSamples;
  }

  addSample(clientSendTime: number, serverTime: number, clientReceiveTime: number): void {
    const rtt = clientReceiveTime - clientSendTime;
    const offset = serverTime - (clientSendTime + rtt / 2);
    this.samples.push({ clientSendTime, serverTime, clientReceiveTime, roundTripTime: rtt, offset });
    if (this.samples.length > this.maxSamples) this.samples.shift();
    this.recalculate();
  }

  private recalculate(): void {
    if (this.samples.length === 0) return;
    const sorted = [...this.samples].sort((a, b) => a.roundTripTime - b.roundTripTime);
    const best = sorted.slice(0, Math.min(3, sorted.length));
    this._offset = best.reduce((s, x) => s + x.offset, 0) / best.length;
    this._rtt = best.reduce((s, x) => s + x.roundTripTime, 0) / best.length;
  }

  toServerTime(localTime: number): number { return localTime + this._offset; }
  toLocalTime(serverTime: number): number { return serverTime - this._offset; }
  get offset(): number { return this._offset; }
  get rtt(): number { return this._rtt; }
  get isCalibrated(): boolean { return this.samples.length >= 3; }
  reset(): void { this.samples = []; this._offset = 0; this._rtt = 0; }
}

// ─── Sync Action Types ────────────────────────────────────────

export type SyncAction =
  | { type: 'play'; time: number }
  | { type: 'pause'; time: number }
  | { type: 'seek'; time: number }
  | { type: 'speed'; speed: number }
  | { type: 'correction'; correction: SyncCorrection }
  | { type: 'none' };

// ─── Sync Engine ──────────────────────────────────────────────

export interface SyncEngineConfig {
  driftThresholdMs: number;
  heartbeatIntervalMs: number;
  seekThresholdMs: number;
  maxGenerationGap: number;
  isHost: boolean;
}

export class SyncEngine {
  private config: SyncEngineConfig;
  private lastGeneration = 0;
  private userId: string;
  private suppressUntil = 0;
  private state: SyncState;

  constructor(userId: string, config?: Partial<SyncEngineConfig>) {
    this.userId = userId;
    this.config = {
      driftThresholdMs: SYNC_CONSTANTS.MAX_DRIFT_MS,
      heartbeatIntervalMs: SYNC_CONSTANTS.HEARTBEAT_INTERVAL_MS,
      seekThresholdMs: SYNC_CONSTANTS.SEEK_THRESHOLD_MS,
      maxGenerationGap: SYNC_CONSTANTS.MAX_GENERATION_GAP,
      isHost: false,
      ...config,
    };
    this.state = createInitialSyncState();
  }

  processEvent(
    type: string, originUserId: string, generation: number,
    time: number, serverTimestamp: number, clock: ClockSync,
    metadata?: Record<string, unknown>
  ): SyncAction {
    if (originUserId === this.userId) {
      if (generation > this.lastGeneration) this.lastGeneration = generation;
      return { type: 'none' };
    }
    if (generation <= this.lastGeneration) return { type: 'none' };
    if (generation - this.lastGeneration > this.config.maxGenerationGap) {
      this.lastGeneration = generation;
      return { type: 'none' };
    }
    if (Date.now() < this.suppressUntil) {
      this.lastGeneration = generation;
      return { type: 'none' };
    }

    this.lastGeneration = generation;
    const latencyMs = Date.now() - clock.toLocalTime(serverTimestamp);
    const compensatedTime = type === 'play' ? time + Math.max(0, latencyMs) / 1000 : time;
    this.state.generation = generation;
    this.state.lastEventAt = serverTimestamp;
    this.state.currentTime = compensatedTime;

    switch (type) {
      case 'play':
        this.state.isPlaying = true;
        return { type: 'play', time: compensatedTime };
      case 'pause':
        this.state.isPlaying = false;
        return { type: 'pause', time };
      case 'seek':
        return { type: 'seek', time };
      case 'speed':
        const speed = (metadata?.speed as number) ?? 1;
        this.state.playbackSpeed = speed;
        return { type: 'speed', speed };
      default:
        return { type: 'none' };
    }
  }

  processCorrection(correction: SyncCorrection): SyncAction {
    this.lastGeneration = correction.generation;
    this.state.generation = correction.generation;
    this.state.isPlaying = correction.isPlaying;
    this.state.playbackSpeed = correction.speed;
    this.state.currentTime = correction.targetTime;
    return { type: 'correction', correction };
  }

  checkDrift(actualTime: number, expectedTime: number): DriftReport | null {
    const driftMs = Math.abs(actualTime - expectedTime) * 1000;
    if (driftMs > this.config.driftThresholdMs) {
      return { userId: this.userId, reportedTime: actualTime, expectedTime, driftMs, timestamp: Date.now() };
    }
    return null;
  }

  getExpectedTime(serverNow: number): number {
    if (!this.state.isPlaying) return this.state.currentTime;
    const elapsed = (serverNow - this.state.lastEventAt) / 1000;
    return this.state.currentTime + elapsed * this.state.playbackSpeed;
  }

  suppress(durationMs = 500): void { this.suppressUntil = Date.now() + durationMs; }
  nextGeneration(): number { return ++this.lastGeneration; }
  getState(): Readonly<SyncState> { return { ...this.state }; }
  setState(state: SyncState): void { this.state = { ...state }; this.lastGeneration = state.generation; }
  setUserId(userId: string): void { this.userId = userId; }
}

// ─── Factory & Utilities ──────────────────────────────────────

export function createInitialSyncState(): SyncState {
  return {
    isPlaying: false, currentTime: 0, playbackSpeed: 1, generation: 0,
    lastEventAt: Date.now(), activeSubtitle: null, activeQuality: null, anime: null,
  };
}

export function compensateTime(
  time: number, isPlaying: boolean, speed: number,
  serverTimestamp: number, localNow: number, clockOffset: number
): number {
  if (!isPlaying) return time;
  const serverNow = localNow + clockOffset;
  return time + Math.max(0, (serverNow - serverTimestamp) / 1000) * speed;
}

export function isSignificantSeek(current: number, target: number, thresholdMs = 1000): boolean {
  return Math.abs(current - target) * 1000 > thresholdMs;
}
