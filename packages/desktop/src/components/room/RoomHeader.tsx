// ═══════════════════════════════════════════════════════════════
// Room — Unified Header
// Back, Avatar, Room Info, Members, Theme, Log Copy — WRITTEN ONCE
// Adapts to desktop / mobile-portrait / mobile-landscape via mode prop
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { useAuthStore, useUIStore, useRoomStore } from '../../stores';
import {
  isXiaomi, isMobile,
  TOUCH_SIZE, HEADER_PAD, ANIM_SPEED, ICON_SIZE, FONT_HEADER, SAFE_TOP,
  type ResolvedTheme, type RoomMode,
} from './constants';
import ThemeToggleBtn from '../ThemeToggleBtn';

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
  const currentRoom = useRoomStore(s => s.currentRoom);

  const isDesktop = mode === 'desktop';
  const isLandscape = mode === 'mobile-landscape';
  const isPortraitMode = mode === 'mobile-portrait';

  // ─── Render Helpers ───
  const globalTheme = useUIStore(s => s.theme);
  const isGlobalLight = globalTheme === 'light';
  const useLightOverride = isGlobalLight && !activeTheme.isImage && !activeTheme.isVideo;
  
  const headerBg = activeTheme.isImage ? activeTheme.glassColor : (useLightOverride ? '#f1f5f9' : `${activeTheme.bg}ee`);
  const effectiveIsLight = activeTheme.isLight || useLightOverride;
  const headerText = effectiveIsLight ? '#475569' : '#94a3b8';

  // ── Render: Back Button (defined once) ──
  const renderBack = () => {
    if (isDesktop && !isMobile) {
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
        color: isLandscape ? 'white' : headerText,
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
          <div style={{ 
            fontWeight: 700, fontSize: 15,
            whiteSpace: isMobile ? 'nowrap' : 'normal',
            overflow: isMobile ? 'hidden' : 'visible',
            textOverflow: isMobile ? 'ellipsis' : 'clip',
          }}>{roomName}</div>
          <div style={{ 
            fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: isMobile ? 6 : 12, 
            whiteSpace: 'nowrap', overflow: isMobile ? 'hidden' : 'visible', textOverflow: 'ellipsis', minWidth: 0
          }}>
            <span onClick={onCopyCode} style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {!isMobile && 'Kod: '}<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{roomCode}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
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
            color: isLandscape ? undefined : headerText,
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

    return (
      <button onClick={onShowMembers} style={{
        background: 'none', border: 'none',
        color: isLandscape ? 'white' : headerText,
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
          <svg width="16" height="16" viewBox="-5 -2 24 24" fill="currentColor" stroke="none">
            <path d="M2 13a5 5 0 0 0 10 0c0-1.726-1.66-5.031-5-9.653C3.66 7.969 2 11.274 2 13zM7 0c4.667 6.09 7 10.423 7 13a7 7 0 0 1-14 0c0-2.577 2.333-6.91 7-13z"></path>
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
          <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="-5 -2 24 24" fill="currentColor" stroke="none">
            <path d="M2 13a5 5 0 0 0 10 0c0-1.726-1.66-5.031-5-9.653C3.66 7.969 2 11.274 2 13zM7 0c4.667 6.09 7 10.423 7 13a7 7 0 0 1-14 0c0-2.577 2.333-6.91 7-13z"></path>
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
        <svg width={iconSz} height={iconSz} viewBox="-5 -2 24 24" fill="currentColor" stroke="none">
          <path d="M2 13a5 5 0 0 0 10 0c0-1.726-1.66-5.031-5-9.653C3.66 7.969 2 11.274 2 13zM7 0c4.667 6.09 7 10.423 7 13a7 7 0 0 1-14 0c0-2.577 2.333-6.91 7-13z"></path>
        </svg>
      </button>
    );
  };

  // ── Render: Log Copy Button (defined once, always visible when bridge available) ──
  const renderLogButton = () => {
    return null;
  };

  // ── Render: "Anime Aç" Button (desktop only, when no URL) ──
  const renderAnimeButton = () => {
    // Show only if user is Host (or if there's no URL yet, anyone can see it if we want, but let's restrict to Host if room is active)
    const isHost = currentRoom?.hostId === myUsername;
    if (!isHost) return null;
    
    return (
      <button className="btn btn--secondary btn--sm" onClick={onShowUrlInput} style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        {!isPortraitMode && <span>Link Gir</span>}
      </button>
    );
  };

  // ══════════════════════════════════════════════════════════
  // LAYOUT: Container changes per mode, but buttons are shared
  // ══════════════════════════════════════════════════════════

  if (isLandscape) {
    return (
      <div data-anisync-header="landscape" style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10, display: 'flex', alignItems: 'center',
        padding: HEADER_PAD, paddingTop: `calc(var(--safe-top, 36px) + ${SAFE_TOP + 24}px)`, gap: isXiaomi ? 10 : 8,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        pointerEvents: 'auto',
        minHeight: TOUCH_SIZE,
      }}>
        {renderBack()}
        {renderRoomInfo()}
        {renderMembers()}
        {renderLogButton()}
        {renderTheme()}
        <ThemeToggleBtn size={ICON_SIZE} color="white" style={{ padding: isXiaomi ? 8 : 6, opacity: 0.9, minWidth: TOUCH_SIZE, minHeight: TOUCH_SIZE, justifyContent: 'center' }} />
      </div>
    );
  }

  if (isPortraitMode) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: isKeyboardOpen ? 6 : (isXiaomi ? 10 : 8),
        padding: isKeyboardOpen ? '2px 8px' : HEADER_PAD,
        paddingTop: isKeyboardOpen ? 2 : `calc(var(--safe-top, 44px) + ${SAFE_TOP + (isXiaomi ? 32 : 28)}px)`,
        background: headerBg,
        backdropFilter: 'none',
        borderBottom: `1px solid ${effectiveIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
        flexShrink: 0,
        transition: `background ${ANIM_SPEED} cubic-bezier(0.4, 0, 0.2, 1)`,
        minHeight: isKeyboardOpen ? 28 : `calc(var(--safe-top, 32px) + ${TOUCH_SIZE}px)`,
        overflow: 'hidden',
      }}>
        {renderBack()}
        {renderAvatar()}
        {renderRoomInfo()}
        {renderAnimeButton()}
        {renderMembers()}
        {renderLogButton()}
        {renderTheme()}
        <ThemeToggleBtn size={isKeyboardOpen ? 13 : (isXiaomi ? 18 : 16)} color={activeTheme.accent} style={{ padding: isKeyboardOpen ? 2 : (isXiaomi ? 6 : 4), flexShrink: 0, minWidth: isKeyboardOpen ? 'auto' : TOUCH_SIZE, minHeight: isKeyboardOpen ? 'auto' : TOUCH_SIZE, justifyContent: 'center' }} />
      </div>
    );
  }

  // ── Desktop (Also used for Mobile Pre-Anime) ──
  if (isMobile) {
    return (
      <div className="sync-bar" style={{ 
        background: headerBg, 
        transition: 'background 0.4s ease',
        padding: '8px 12px',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden'
      }}>
        {renderBack()}
        {renderAvatar()}
        {renderRoomInfo()}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {renderAnimeButton()}
          {renderLogButton()}
          {renderTheme()}
          <ThemeToggleBtn size={16} color={activeTheme.accent} style={{ padding: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="sync-bar" style={{ background: headerBg, transition: 'background 0.4s ease' }}>
      {renderBack()}
      {renderAvatar()}
      {renderRoomInfo()}
      {renderAnimeButton()}
      {renderLogButton()}
      {renderTheme()}
      <ThemeToggleBtn size={16} color={activeTheme.accent} style={{ padding: 6 }} />
    </div>
  );
}
