// ═══════════════════════════════════════════════════════════════
// @anisync/shared — Player Abstraction Layer
// Unified interface for controlling different video player types
// ═══════════════════════════════════════════════════════════════

import type { SubtitleTrack, QualityLevel, PlayerType, AnimeSite } from '../types';

// ─── Player Controller Interface ──────────────────────────────

export type PlaybackState = 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export interface IPlayerController {
  readonly type: PlayerType;
  readonly site: AnimeSite;
  readonly isReady: boolean;

  play(): Promise<void>;
  pause(): Promise<void>;
  seek(time: number): Promise<void>;
  getTime(): Promise<number>;
  getDuration(): Promise<number>;
  setSpeed(speed: number): Promise<void>;
  getSpeed(): Promise<number>;

  getSubtitles(): Promise<SubtitleTrack[]>;
  setSubtitle(trackId: string): Promise<void>;
  getQualities(): Promise<QualityLevel[]>;
  setQuality(qualityId: string): Promise<void>;

  getState(): Promise<PlaybackState>;
  onStateChange(cb: (state: PlaybackState) => void): () => void;
  onTimeUpdate(cb: (time: number) => void): () => void;
  onSeeked(cb: (time: number) => void): () => void;

  destroy(): void;
}

// ─── Player Detection Result ──────────────────────────────────

export interface PlayerDetectionResult {
  controller: IPlayerController;
  element: unknown; // HTMLVideoElement or player instance
  confidence: number; // 0-1
  site: AnimeSite;
}

// ─── Site Detection Patterns ──────────────────────────────────

export interface SitePattern {
  site: AnimeSite;
  urlPatterns: RegExp[];
  playerSelectors: string[];
  waitForSelector?: string;
  specialInit?: string; // script to run for initialization
}

export const SITE_PATTERNS: SitePattern[] = [
  {
    site: 'turkanime',
    urlPatterns: [/turkanime\./i, /turkani\.me/i],
    playerSelectors: ['video', '#player video', '.jwplayer video', 'iframe[src*="player"]'],
    waitForSelector: 'video',
  },
  {
    site: 'tranimeizle',
    urlPatterns: [/tranimeizle\./i, /tranime\./i],
    playerSelectors: ['video', '.video-player video', 'iframe[src*="embed"]'],
    waitForSelector: 'video',
  },
  {
    site: 'generic',
    urlPatterns: [/.*/],
    playerSelectors: ['video', 'iframe[src*="player"]', 'iframe[src*="embed"]'],
  },
];

export function detectSite(url: string): AnimeSite {
  for (const pattern of SITE_PATTERNS) {
    if (pattern.site === 'generic') continue;
    if (pattern.urlPatterns.some(p => p.test(url))) return pattern.site;
  }
  return 'unknown';
}
