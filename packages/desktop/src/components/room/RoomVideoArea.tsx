// ═══════════════════════════════════════════════════════════════
// Room — Video Area
// Electron BrowserView placeholder, WebAnimeCard, URL input, empty state
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRoomStore, useAuthStore, useUIStore } from '../../stores';
import { isElectron, isMobile, getTheme, type RoomMode } from './constants';

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

// ─── Web Anime Card (non-Electron browsers) ──────────────
function WebAnimeCard({ url }: { url: string }) {
  const [lastOpenedUrl, setLastOpenedUrl] = useState<string | null>(null);
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  
  useEffect(() => { 
    if (lastOpenedUrl !== url) { 
      window.open(url, '_blank'); 
      setLastOpenedUrl(url); 
    } 
  }, [url, lastOpenedUrl]);
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(34,211,238,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#0ea5e9' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg></div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Anime Yeni Sekmede Açıldı</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, wordBreak: 'break-all' }}>{domain}</p>
        <button className="btn btn--primary btn--full" onClick={() => window.open(url, '_blank')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Tekrar Aç</button>
      </div>
    </div>
  );
}

// ─── Video Area Props ─────────────────────────────────────
interface RoomVideoAreaProps {
  mode: RoomMode;
  currentUrl: string | null;
  // Electron BrowserView
  animeAreaRef: React.RefObject<HTMLDivElement>;
  animeLoaded: boolean;
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
  animeAreaRef, animeLoaded,
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

  // Mobile modes: video is rendered natively, no React video area needed
  if (isMobile) {
    return null;
  }

  // ── Desktop mode ──
  return (
    <>
      {/* URL Input Bar (pre-anime) — Multi-platform support */}
      {showUrlInput && !currentUrl && (
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

      {/* Electron Navigation Bar */}
      {isElectron && currentUrl && (
        <div style={{
          height: 32, display: 'flex', alignItems: 'center', gap: 4,
          padding: '0 8px', background: bgTertiary,
          borderBottom: '1px solid var(--border)', fontSize: 13,
        }}>
          <button onClick={() => (window as any).anisync.anime.goBack()} title="Geri"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => (window as any).anisync.anime.goForward()} title="İleri"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => (window as any).anisync.anime.reload()} title="Yenile"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
          </button>
            <input value={displayUrl} onChange={e => onDisplayUrlChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onNavUrlSubmit()}
              style={{
                flex: 1, height: 24, padding: '0 8px', fontSize: 12,
                background: bgPrimary, border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-primary)', outline: 'none',
                fontFamily: 'var(--font-mono)',
              }} />
        </div>
      )}

      {/* Player Area */}
      {currentUrl ? (
        isElectron ? (
          <div ref={animeAreaRef} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bgPrimary,
          }}>
            {animeLoaded ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" /></svg>
                  Anime BrowserView'da açıldı
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p>
            )}
          </div>
        ) : isMobile ? null : (
          <WebAnimeCard url={currentUrl} />
        )
      ) : !isElectron ? (
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
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: bgPrimary,
          backgroundImage: activeTheme.isImage ? 'none' : 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.04) 0%, transparent 70%)',
        }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2, marginBottom: 16 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Anime seçilmedi</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              "Anime Aç" butonuna tıklayarak link yapıştırın
            </p>
          </div>
        </div>
      )}
    </>
  );
}
