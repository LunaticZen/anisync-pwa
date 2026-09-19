// ═══════════════════════════════════════════════════════════════
// Room — Video Area
// Electron BrowserView placeholder, WebAnimeCard, URL input, empty state
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useRoomStore, useAuthStore, useUIStore, useSyncStore } from '../../stores';
import { getSocket } from '../../services/socket';
import { getTheme, type RoomMode } from './constants';

// ─── Multi-Platform URL Detection ─────────────────────────
// Auto-detects the streaming platform from the URL for badge display.
// This is purely cosmetic — the actual navigation logic is unchanged.

interface PlatformInfo {
  name: string;
  icon: string;
  textColor: string;
  bgColor: string;
}

function detectPlatform(url: string): PlatformInfo | null {
  if (!url || url.length < 8) return null;
  try {
    // Ensure URL has protocol for parsing
    const fullUrl = url.startsWith('http') ? url : 'https://' + url;
    const hostname = new URL(fullUrl).hostname.toLowerCase();

    if (hostname.includes('animecix')) {
      return { name: 'Animecix', icon: '🎌', textColor: '#e879f9', bgColor: 'rgba(232,121,249,0.12)' };
    }
    if (hostname.includes('dizibox')) {
      return { name: 'Dizibox', icon: '📺', textColor: '#38bdf8', bgColor: 'rgba(56,189,248,0.12)' };
    }
    // Generic detected site
    return { name: hostname.replace('www.', ''), icon: '🌐', textColor: '#94a3b8', bgColor: 'rgba(148,163,184,0.08)' };
  } catch {
    return null;
  }
}



// ─── Video Area Props ─────────────────────────────────────
interface RoomVideoAreaProps {
  mode: RoomMode;
  currentUrl: string | null;
  // HTML5 Video
  videoRef: React.RefObject<HTMLVideoElement>;
  ignoreSync: React.MutableRefObject<number>;
  // Electron navigation bar
  displayUrl: string;
  onDisplayUrlChange: (url: string) => void;
  onNavUrlSubmit: () => void;
  // URL input (pre-anime)
  showUrlInput: boolean;
  animeUrl: string;
  onAnimeUrlChange: (url: string) => void;
  onNavigate: () => void;
  onToggleUrlInput: () => void;
}

// ─── Video Area Component ─────────────────────────────────
export function RoomVideoArea({
  mode, currentUrl,
  videoRef, ignoreSync,
  displayUrl, onDisplayUrlChange, onNavUrlSubmit,
  showUrlInput, animeUrl, onAnimeUrlChange, onNavigate, onToggleUrlInput,
}: RoomVideoAreaProps) {
  const isMobile = mode === 'mobile-portrait' || mode === 'mobile-landscape';
  const themeName = useRoomStore(s => s.theme);
  const globalTheme = useUIStore(s => s.theme);
  const activeTheme = getTheme(themeName);
  
  const isGlobalLight = globalTheme === 'light';
  const useLightOverride = isGlobalLight && !activeTheme.isImage && !activeTheme.isVideo;
  
  const bgPrimary = activeTheme.isImage ? 'transparent' : (useLightOverride ? 'var(--bg-primary)' : activeTheme.bg);
  const members = useRoomStore(s => s.members);
  const currentRoom = useRoomStore(s => s.currentRoom);
  const myUsername = useAuthStore(s => s.username);
  const myAvatar = useAuthStore(s => s.avatar);
  const hostId = currentRoom?.hostId;
  const bgTertiary = activeTheme.isImage ? 'rgba(0,0,0,0.2)' : 'var(--bg-tertiary)';

  const animeAreaRef = useRef<HTMLDivElement>(null);
  const [isElectron, setIsElectron] = useState(false);
  useEffect(() => { if ((window as any).ipcRenderer) setIsElectron(true); }, []);

  useEffect(() => {
    const syncBoundsToElectron = () => {
      if (isElectron && animeAreaRef.current && currentUrl && (window as any).ipcRenderer) {
        const rect = animeAreaRef.current.getBoundingClientRect();
        (window as any).ipcRenderer.send('sync-video-bounds', {
          x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)
        });
      }
    };
    syncBoundsToElectron();
    window.addEventListener('resize', syncBoundsToElectron);
    return () => window.removeEventListener('resize', syncBoundsToElectron);
  }, [isElectron, currentUrl]);

  // Mobile modes: video is rendered natively if inside Capacitor Android app (hasBridge).
  // If there is no bridge, they are using Safari/Chrome on mobile, so WE MUST RENDER the React video area!
  const hasBridge = typeof (window as any).AniSyncBridge !== 'undefined';
  if (hasBridge && isMobile && currentUrl && !showUrlInput) {
    return null;
  }

  const applySync = () => {
    const v = videoRef.current;
    if (!v) return;
    const syncState = useSyncStore.getState().syncState;
    if (syncState) {
      try {
        if (syncState.currentTime > 0 && Math.abs(v.currentTime - syncState.currentTime) > 1.0) {
          v.currentTime = syncState.currentTime;
        }
        if (syncState.isPlaying) {
          v.play().catch(() => {});
        }
      } catch (err) {
        console.error('[RoomVideoArea] applySync error:', err);
      }
    }
  };

  useEffect(() => {
    // Attempt sync immediately in case metadata is already loaded
    if (currentUrl && videoRef.current && videoRef.current.readyState >= 1) {
      applySync();
    }
  }, [currentUrl, videoRef]);

  const handlePlay = () => {
    if (Date.now() < ignoreSync.current) return;
    const socket = getSocket();
    if (!socket || !currentRoom) return;
    socket.emit('sync:play', { roomId: currentRoom.id, time: videoRef.current?.currentTime || 0, generation: Date.now() });
  };

  const handlePause = () => {
    if (Date.now() < ignoreSync.current) return;
    const socket = getSocket();
    if (!socket || !currentRoom) return;
    socket.emit('sync:pause', { roomId: currentRoom.id, time: videoRef.current?.currentTime || 0, generation: Date.now() });
  };

  const handleSeeked = () => {
    if (Date.now() < ignoreSync.current) return;
    const socket = getSocket();
    if (!socket || !currentRoom) return;
    socket.emit('sync:seek', { roomId: currentRoom.id, time: videoRef.current?.currentTime || 0, generation: Date.now() });
  };

  // ── Desktop mode ──
  return (
    <>
      {/* URL Input Bar (pre-anime) — Multi-platform support */}
      {(showUrlInput || (isMobile && !currentUrl)) && (
        <div style={{ padding: '8px 16px', background: bgTertiary, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="form-input" value={animeUrl} onChange={e => onAnimeUrlChange(e.target.value)}
              placeholder="Anime veya dizi linki yapıştırın..." autoFocus
              onKeyDown={e => e.key === 'Enter' && onNavigate()}
              style={{ flex: 1 }} />
            <button className="btn btn--primary btn--sm" onClick={onNavigate}>Git</button>
            <button className="btn btn--ghost btn--sm" onClick={onToggleUrlInput}>✕</button>
          </div>
          {/* Platform auto-detection badge + supported sites info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            {(() => {
              const platform = detectPlatform(animeUrl);
              if (platform) {
                return (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 20, background: platform.bgColor,
                    color: platform.textColor, letterSpacing: 0.3,
                    transition: 'all 0.2s ease',
                  }}>
                    <span style={{ fontSize: 13 }}>{platform.icon}</span>
                    {platform.name}
                  </span>
                );
              }
              return (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ opacity: 0.6 }}>Desteklenen:</span>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <span style={{ padding: '1px 6px', borderRadius: 10, background: 'rgba(232,121,249,0.1)', color: '#e879f9', fontSize: 10, fontWeight: 600 }}>Animecix</span>
                    <span style={{ padding: '1px 6px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', color: '#38bdf8', fontSize: 10, fontWeight: 600 }}>Dizibox</span>
                    <span style={{ padding: '1px 6px', borderRadius: 10, background: 'rgba(148,163,184,0.08)', color: '#94a3b8', fontSize: 10, fontWeight: 600 }}>+ Diğer</span>
                  </span>
                </span>
              );
            })()}
          </div>
        </div>
      )}



      {/* Player Area */}
      {currentUrl ? (
        isElectron ? (
          <div ref={animeAreaRef} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#000', position: 'relative', minHeight: 0, minWidth: 0, width: '100%', height: '100%'
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)' }}>
              Video Oynatıcı Yükleniyor...
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#000', position: 'relative', minHeight: 0, minWidth: 0,
            width: '100%', height: '100%'
          }}>
            <video
              ref={videoRef}
              src={currentUrl}
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              onLoadedMetadata={applySync}
            />
          </div>
        )
      ) : (
        <div style={{
          padding: '24px 16px',
          display: 'flex', flexDirection: 'column', gap: 24,
          background: activeTheme.isImage ? activeTheme.glassColor : bgPrimary,
          borderBottom: `1px solid ${activeTheme.border}`,
        }}>
          {/* Members List */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Lobi ({members.length})</span>
            </div>
            <div style={{ 
              display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
              scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' 
            }}>
              {members.map(m => {
                const displayAvatar = m.userId === myUsername ? myAvatar : ((m as any).avatar || m.avatarUrl);
                return (
                <div key={m.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, width: 64 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: displayAvatar ? `url(${displayAvatar}) center/cover` : 'linear-gradient(135deg, #5b7cff, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 600, color: 'white',
                    position: 'relative'
                  }}>
                    {!displayAvatar && m.username.charAt(0).toUpperCase()}
                    {m.userId === hostId && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent)', borderRadius: '50%', padding: 2 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {m.displayName || m.username}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
