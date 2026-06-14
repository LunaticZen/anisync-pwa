// ═══════════════════════════════════════════════════════════════
// Room — Unified Header
// Back, Avatar, Room Info, Members, Theme, Log Copy — WRITTEN ONCE
// Adapts to desktop / mobile-portrait / mobile-landscape via mode prop
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { useAuthStore } from '../../stores';
import {
  isXiaomi, isMobile,
  TOUCH_SIZE, HEADER_PAD, ANIM_SPEED, ICON_SIZE, FONT_HEADER, SAFE_TOP,
  type ResolvedTheme, type RoomMode,
} from './constants';

// ─── Props ────────────────────────────────────────────────
interface RoomHeaderProps {
  mode: RoomMode;
  roomName: string;
  roomCode: string;
  memberCount: number;
  maxMembers: number;
  pendingRequestCount: number;
  activeTheme: ResolvedTheme;
  currentUrl: string | null;
  isKeyboardOpen: boolean;
  hasBridge: boolean;
  logCopied: boolean;
  onBack: () => void;
  onShowMembers: () => void;
  onShowThemes: () => void;
  onCopyLogs: () => void;
  onCopyCode: () => void;
  onShowProfile: () => void;
  onShowUrlInput: () => void;
  showUrlInput: boolean;
}

// ─── Header Component ─────────────────────────────────────
export function RoomHeader({
  mode, roomName, roomCode, memberCount, maxMembers, pendingRequestCount,
  activeTheme, currentUrl, isKeyboardOpen, hasBridge, logCopied,
  onBack, onShowMembers, onShowThemes, onCopyLogs, onCopyCode, onShowProfile,
  onShowUrlInput, showUrlInput,
}: RoomHeaderProps) {
  const avatar = useAuthStore(s => s.avatar);
  const myUsername = useAuthStore(s => s.username);

  const isDesktop = mode === 'desktop';
  const isLandscape = mode === 'mobile-landscape';
  const isPortraitMode = mode === 'mobile-portrait';

  // ── Render: Back Button (defined once) ──
  const renderBack = () => {
    if (isDesktop) {
      return (
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
      );
    }
    // Mobile (portrait + landscape)
    const iconSize = isPortraitMode && isKeyboardOpen ? 14 : ICON_SIZE;
    return (
      <button onClick={onBack} style={{
        background: 'none', border: 'none',
        color: isLandscape ? 'white' : (activeTheme.isLight ? '#475569' : '#94a3b8'),
        cursor: 'pointer', display: 'flex',
        padding: isLandscape ? (isXiaomi ? 8 : 6) : (isKeyboardOpen ? 2 : (isXiaomi ? 6 : 4)),
        minWidth: isKeyboardOpen ? 'auto' : TOUCH_SIZE,
        minHeight: isKeyboardOpen ? 'auto' : TOUCH_SIZE,
        alignItems: 'center', justifyContent: 'center',
        opacity: isLandscape ? 0.9 : undefined,
        /* padding removed from transition */
      }}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
    );
  };

  // ── Render: Avatar (defined once, hidden in landscape) ──
  const renderAvatar = () => {
    if (isLandscape) return null;

    // Compact mode when keyboard/split-screen is active
    const compact = isPortraitMode && isKeyboardOpen;
    const size = compact ? 20 : (isDesktop ? 32 : (isXiaomi ? 32 : 28));
    return (
      <div onClick={onShowProfile} style={{
        width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
        background: avatar ? `url(${avatar}) center/cover` : (isDesktop ? 'var(--accent-gradient)' : 'linear-gradient(135deg, #5b7cff, #a855f7)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 8 : (isDesktop ? 12 : (isXiaomi ? 12 : 11)), fontWeight: 700, color: 'white',
        border: isDesktop ? '1.5px solid rgba(91,124,255,0.3)' : undefined,
        transition: isPortraitMode ? `background ${ANIM_SPEED} ease` : undefined,
      }} title={isDesktop ? 'Profil fotoğrafını değiştir' : undefined}>
        {!avatar && (myUsername || '?')[0].toUpperCase()}
      </div>
    );
  };

  // ── Render: Room Info (defined once) ──
  const renderRoomInfo = () => {
    if (isDesktop) {
      return (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{roomName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span onClick={onCopyCode} style={{ cursor: 'pointer' }}>
              Kod: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{roomCode}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              {memberCount}/{maxMembers}
            </span>
          </div>
        </div>
      );
    }

    // Mobile (portrait + landscape)
    return (
      <div style={{
        flex: 1, minWidth: 0, display: 'flex',
        flexDirection: isPortraitMode && isKeyboardOpen ? 'row' as const : 'column' as const,
        alignItems: isPortraitMode && isKeyboardOpen ? 'center' : 'flex-start',
        gap: isPortraitMode && isKeyboardOpen ? 6 : 0,
        color: isLandscape ? 'white' : activeTheme.textColor,
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: isPortraitMode && isKeyboardOpen ? 11 : FONT_HEADER,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: isPortraitMode ? `font-size ${ANIM_SPEED} ease` : undefined,
          lineHeight: 1.2,
          ...(isLandscape ? { opacity: 0.95 } : {}),
        }}>{roomName}</div>
        {!(isPortraitMode && isKeyboardOpen) && (
          <div style={{
            fontSize: isLandscape ? 10 : (isXiaomi ? 12 : 11),
            color: isLandscape ? undefined : (activeTheme.isLight ? '#64748b' : '#64748b'),
            opacity: isLandscape ? 0.6 : undefined,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>● CANLI</span>
            <span onClick={onCopyCode} style={{ cursor: 'pointer', fontFamily: 'monospace' }}>{roomCode}</span>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Members Button (defined once, mobile only) ──
  const renderMembers = () => {
    if (isDesktop) return null; // Desktop shows members in sidebar

    const iconSize = isPortraitMode && isKeyboardOpen ? 13 : ICON_SIZE;
    const badgeSize = isPortraitMode && isKeyboardOpen ? 12 : (isXiaomi ? 18 : 16);

    return (
      <button onClick={onShowMembers} style={{
        background: 'none', border: 'none',
        color: isLandscape ? 'white' : (activeTheme.isLight ? '#475569' : '#94a3b8'),
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: isLandscape ? 4 : 3, position: 'relative',
        padding: isLandscape ? (isXiaomi ? 8 : 6) : (isKeyboardOpen ? 2 : (isXiaomi ? 6 : 4)),
        flexShrink: 0,
        minWidth: isKeyboardOpen ? 'auto' : TOUCH_SIZE,
        minHeight: isKeyboardOpen ? 'auto' : TOUCH_SIZE,
        justifyContent: 'center',
        opacity: isLandscape ? 0.9 : undefined,
        /* padding removed from transition */
      }}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span style={{
          fontSize: isKeyboardOpen ? 10 : (isLandscape ? 11 : (isXiaomi ? 13 : 12)),
          fontWeight: 700,
        }}>{memberCount}</span>
        {pendingRequestCount > 0 && (
          <span style={{
            position: 'absolute', top: isKeyboardOpen ? -2 : (isLandscape ? 0 : -2),
            right: isKeyboardOpen ? -2 : (isLandscape ? 0 : -2),
            width: isKeyboardOpen ? 12 : (isXiaomi ? (isLandscape ? 16 : 18) : (isLandscape ? 14 : 16)),
            height: isKeyboardOpen ? 12 : (isXiaomi ? (isLandscape ? 16 : 18) : (isLandscape ? 14 : 16)),
            borderRadius: '50%', background: '#ef4444', color: 'white',
            fontSize: isKeyboardOpen ? 7 : (isXiaomi ? (isLandscape ? 9 : 10) : (isLandscape ? 8 : 9)),
            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isPortraitMode ? '0 0 8px rgba(239,68,68,0.5)' : undefined,
          }}>{pendingRequestCount}</span>
        )}
      </button>
    );
  };

  // ── Render: Theme Button (defined once) ──
  const renderTheme = () => {
    if (isDesktop) {
      return (
        <button onClick={onShowThemes} title="Tema Seç" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: 8, color: activeTheme.accent,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: activeTheme.accent, boxShadow: `0 0 6px ${activeTheme.accent}60` }} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
            <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.35 2.22 1.08 2.22 1.08a4.5 4.5 0 0 0 4.8-4.8l2.05-2.05"></path>
          </svg>
        </button>
      );
    }

    if (isLandscape) {
      return (
        <button onClick={onShowThemes} style={{
          background: 'none', border: 'none', color: 'white', cursor: 'pointer',
          padding: isXiaomi ? 8 : 6, display: 'flex', alignItems: 'center', opacity: 0.9,
          minWidth: TOUCH_SIZE, minHeight: TOUCH_SIZE, justifyContent: 'center',
        }}>
          <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
            <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.35 2.22 1.08 2.22 1.08a4.5 4.5 0 0 0 4.8-4.8l2.05-2.05"></path>
          </svg>
        </button>
      );
    }

    // Portrait — compact when keyboard/split-screen active
    const compact = isPortraitMode && isKeyboardOpen;
    const iconSz = compact ? 13 : (isXiaomi ? 18 : 16);
    const dotSz = compact ? 7 : (isXiaomi ? 12 : 10);
    return (
      <button onClick={onShowThemes} style={{
        background: 'none', border: 'none', color: activeTheme.accent, cursor: 'pointer',
        padding: compact ? 2 : (isXiaomi ? 6 : 4), display: 'flex', alignItems: 'center', gap: compact ? 2 : 4,
        flexShrink: 0,
        minWidth: compact ? 'auto' : TOUCH_SIZE,
        minHeight: compact ? 'auto' : TOUCH_SIZE,
        justifyContent: 'center',
        transition: isPortraitMode ? `opacity ${ANIM_SPEED} ease` : undefined,
      }}>
        <div style={{ width: dotSz, height: dotSz, borderRadius: '50%', background: activeTheme.accent, boxShadow: `0 0 4px ${activeTheme.accent}60` }} />
        <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
          <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.35 2.22 1.08 2.22 1.08a4.5 4.5 0 0 0 4.8-4.8l2.05-2.05"></path>
        </svg>
      </button>
    );
  };

  // ── Render: Log Copy Button (defined once, always visible when bridge available) ──
  const renderLogButton = () => {
    if (!hasBridge) return null;

    // Compact mode when keyboard/split-screen is active
    const compact = isPortraitMode && isKeyboardOpen;
    const iconSize = compact ? 13 : (isLandscape ? ICON_SIZE : (isXiaomi ? 18 : 16));

    return (
      <button onClick={onCopyLogs} title="APK Loglarını Kopyala" style={{
        background: logCopied
          ? (isLandscape ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)')
          : 'none',
        border: 'none',
        color: logCopied ? '#22c55e' : (isLandscape ? 'rgba(255,255,255,0.6)' : (activeTheme.isLight ? '#94a3b8' : '#64748b')),
        cursor: 'pointer',
        padding: compact ? 2 : (isLandscape ? (isXiaomi ? 8 : 6) : (isXiaomi ? 6 : 4)),
        display: 'flex', borderRadius: 6,
        transition: `opacity ${ANIM_SPEED} ease, background ${ANIM_SPEED} ease`,
        flexShrink: 0,
        minWidth: compact ? 'auto' : TOUCH_SIZE,
        minHeight: compact ? 'auto' : TOUCH_SIZE,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
      </button>
    );
  };

  // ── Render: "Anime Aç" Button (desktop only, when no URL) ──
  const renderAnimeButton = () => {
    if (!isDesktop || currentUrl || !isElectron) return null;
    return (
      <button className="btn btn--secondary btn--sm" onClick={onShowUrlInput}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
        Anime Aç
      </button>
    );
  };

  // ══════════════════════════════════════════════════════════
  // LAYOUT: Container changes per mode, but buttons are shared
  // ══════════════════════════════════════════════════════════

  if (isLandscape) {
    return (
      <div data-anisync-header="landscape" style={{
        position: 'absolute', top: SAFE_TOP, left: 0, right: 0,
        zIndex: 10, display: 'flex', alignItems: 'center',
        padding: HEADER_PAD, gap: isXiaomi ? 10 : 8,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        pointerEvents: 'auto',
        minHeight: TOUCH_SIZE,
      }}>
        {renderBack()}
        {renderRoomInfo()}
        {renderMembers()}
        {renderTheme()}
        {renderLogButton()}
      </div>
    );
  }

  if (isPortraitMode) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: isKeyboardOpen ? 6 : (isXiaomi ? 10 : 8),
        padding: isKeyboardOpen ? '2px 8px' : HEADER_PAD,
        paddingTop: isKeyboardOpen ? 2 : (SAFE_TOP + (isXiaomi ? 10 : 8)),
        background: activeTheme.isImage ? activeTheme.glassColor : `${activeTheme.bg}ee`,
        backdropFilter: 'none',
        borderBottom: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
        flexShrink: 0,
        transition: `background ${ANIM_SPEED} cubic-bezier(0.4, 0, 0.2, 1)`, /* layout removed */
        minHeight: isKeyboardOpen ? 28 : TOUCH_SIZE,
        maxHeight: isKeyboardOpen ? 32 : (isXiaomi ? 64 : 60),
        overflow: 'hidden',
      }}>
        {renderBack()}
        {renderAvatar()}
        {renderRoomInfo()}
        {renderMembers()}
        {renderTheme()}
        {renderLogButton()}
      </div>
    );
  }

  // ── Desktop (Also used for Mobile Pre-Anime) ──
  if (isMobile) {
    return (
      <div className="sync-bar" style={{ 
        background: activeTheme.isImage ? activeTheme.glassColor : `${activeTheme.bg}ee`, 
        transition: 'background 0.4s ease',
        padding: '12px 16px',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        {renderBack()}
        {renderAvatar()}
        {renderRoomInfo()}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {renderAnimeButton()}
          {renderTheme()}
          {renderLogButton()}
        </div>
      </div>
    );
  }

  return (
    <div className="sync-bar" style={{ background: activeTheme.isImage ? activeTheme.glassColor : `${activeTheme.bg}ee`, transition: 'background 0.4s ease' }}>
      {renderBack()}
      {renderAvatar()}
      {renderRoomInfo()}
      {renderAnimeButton()}
      {renderTheme()}
      {renderLogButton()}
    </div>
  );
}
