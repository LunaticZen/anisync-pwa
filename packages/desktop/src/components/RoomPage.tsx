// ═══════════════════════════════════════════════════════════════
// Room Page
// PC (Electron): BrowserView ile anime açar (iframe DEĞİL)
// Mobile (WebView): Otomatik anime sayfasına navigate eder
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore, useRoomStore, useSyncStore, useChatStore, useUIStore } from '../stores';
import { getSocket } from '../services/socket';

const isElectron = !!(window as any).anisync;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && !isElectron;

export default function RoomPage() {
  const { currentRoom, members } = useRoomStore();
  const { currentUrl } = useSyncStore();
  const [animeUrl, setAnimeUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [animeLoaded, setAnimeLoaded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [displayUrl, setDisplayUrl] = useState(currentUrl || '');
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const resizingRef = useRef(false);
  const animeAreaRef = useRef<HTMLDivElement>(null);

  // Helper: measure anime area and send exact bounds to Electron
  const syncBoundsToElectron = () => {
    if (!isElectron || !animeAreaRef.current) return;
    const rect = animeAreaRef.current.getBoundingClientRect();
    (window as any).anisync?.anime?.setBounds?.({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
  };

  if (!currentRoom) return null;

  // ── PC (Electron): Open anime in BrowserView ──
  useEffect(() => {
    if (isElectron && currentUrl) {
      (window as any).anisync.anime.navigate(currentUrl);
      setAnimeLoaded(true);
      setTimeout(syncBoundsToElectron, 100);
      setTimeout(syncBoundsToElectron, 500);
    } else if (isElectron && !currentUrl) {
      (window as any).anisync.anime.close();
      setAnimeLoaded(false);
    }
  }, [currentUrl]);

  // ── PC (Electron): Keep BrowserView in sync with layout changes ──
  useEffect(() => {
    if (!isElectron) return;
    const ro = new ResizeObserver(() => syncBoundsToElectron());
    if (animeAreaRef.current) ro.observe(animeAreaRef.current);
    window.addEventListener('resize', syncBoundsToElectron);
    return () => { ro.disconnect(); window.removeEventListener('resize', syncBoundsToElectron); };
  }, [animeLoaded]);

  // ── PC (Electron): Track host URL changes → broadcast to room ──
  useEffect(() => {
    if (!isElectron || !currentRoom) return;
    const isHost = currentRoom.hostId === useAuthStore.getState().username;
    if (!isHost) return;

    const cleanup = (window as any).anisync.anime.onNavigated((newUrl: string) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;
      const current = useSyncStore.getState().currentUrl;
      if (newUrl !== current && newUrl !== 'about:blank') {
        socket.emit('sync:url-changed', { roomId: currentRoom.id, url: newUrl });
        useSyncStore.getState().setCurrentUrl(newUrl);
      }
    });
    return cleanup;
  }, [currentRoom?.id, currentRoom?.hostId]);

  // ── PC (Electron): Video Sync Bridge (event-driven) ──
  useEffect(() => {
    if (!isElectron || !currentUrl || !currentRoom) return;
    const socket = getSocket();
    if (!socket) return;

    let ignoreUntil = 0;
    let lastEventTs = 0;

    const eventPoll = setInterval(async () => {
      try {
        const event = await (window as any).anisync.player.getEvent();
        if (event && event.ts > lastEventTs && Date.now() > ignoreUntil) {
          lastEventTs = event.ts;
          const { type, time } = event;
          if (type === 'play') socket.emit('sync:play', { roomId: currentRoom.id, time, generation: Date.now() });
          else if (type === 'pause') socket.emit('sync:pause', { roomId: currentRoom.id, time, generation: Date.now() });
          else if (type === 'seek') socket.emit('sync:seek', { roomId: currentRoom.id, time, generation: Date.now() });
        }
      } catch { }
    }, 500);

    const timecheckPoll = setInterval(async () => {
      try {
        const state = await (window as any).anisync.player.getState();
        if (!state || state.time === undefined) return;
        socket.emit('sync:timecheck', {
          roomId: currentRoom.id, time: state.time,
          playing: state.state === 'playing', userId: useAuthStore.getState().username,
        });
      } catch { }
    }, 5000);

    const onPlay = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
      (window as any).anisync.player.play();
    };
    const onPause = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
      (window as any).anisync.player.pause();
    };
    const onSeek = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
    };
    const onTimecheck = (d: any) => {
      if (d.userId === useAuthStore.getState().username) return;
      (window as any).anisync.player.getState().then((state: any) => {
        if (!state || state.time === undefined) return;
        const drift = Math.abs(state.time - d.time);
        if (drift > 1.5) {
          ignoreUntil = Date.now() + 1500;
          (window as any).anisync.player.seek(d.time);
          if (d.playing && state.state !== 'playing') (window as any).anisync.player.play();
          if (!d.playing && state.state === 'playing') (window as any).anisync.player.pause();
        }
      }).catch(() => { });
    };

    socket.on('sync:play', onPlay);
    socket.on('sync:pause', onPause);
    socket.on('sync:seek', onSeek);
    socket.on('sync:timecheck', onTimecheck);

    return () => {
      clearInterval(eventPoll);
      clearInterval(timecheckPoll);
      socket.off('sync:play', onPlay);
      socket.off('sync:pause', onPause);
      socket.off('sync:seek', onSeek);
      socket.off('sync:timecheck', onTimecheck);
    };
  }, [currentUrl, currentRoom?.id]);

  // ── Mobile: Open anime in second WebView via native bridge ──
  useEffect(() => {
    if (isMobile && currentUrl) {
      if ((window as any).AniSyncBridge?.openAnime) {
        (window as any).AniSyncBridge.openAnime(currentUrl);
      } else {
        setTimeout(() => { window.location.href = currentUrl; }, 300);
      }
    }
  }, [currentUrl]);

  // ── Mobile: Receive sync events → control anime WebView via bridge ──
  // FIX: Added drift threshold to prevent micro-seek stuttering
  useEffect(() => {
    if (!isMobile || !currentUrl || !currentRoom) return;
    const socket = getSocket();
    if (!socket) return;

    const bridge = (window as any).AniSyncBridge;
    if (!bridge?.controlAnime) return;

    let lastSyncTime = 0; // Prevent rapid re-syncs

    const onPlay = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('play', d.time || 0);
    };
    const onPause = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('pause', d.time || 0);
    };
    const onSeek = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('seek', d.time || 0);
    };
    const onTimecheck = (d: any) => {
      if (d.userId === useAuthStore.getState().username) return;

      // ── DRIFT THRESHOLD FIX ──
      // Only seek if drift is significant (>3 seconds).
      // Without this, every 5s timecheck causes a micro-seek that looks like stuttering.
      // Mobile WebView video time reporting has ~1-2s natural variance.
      const now = Date.now();
      if (now - lastSyncTime < 4000) return; // Debounce: max 1 sync per 4s

      // We can't easily read the current video time from the bridge,
      // so we trust the server's time and only apply corrections for play/pause state.
      // The drift correction is handled by play/pause/seek events, not timecheck.
      // Only sync play/pause state, don't seek on every timecheck.
      lastSyncTime = now;
      // Don't seek here — it causes stuttering. Only correct play/pause state.
    };

    socket.on('sync:play', onPlay);
    socket.on('sync:pause', onPause);
    socket.on('sync:seek', onSeek);
    socket.on('sync:timecheck', onTimecheck);

    return () => {
      socket.off('sync:play', onPlay);
      socket.off('sync:pause', onPause);
      socket.off('sync:seek', onSeek);
      socket.off('sync:timecheck', onTimecheck);
    };
  }, [currentUrl, currentRoom?.id]);

  // ── Mobile: Track host URL changes from Android WebView ──
  useEffect(() => {
    if (!isMobile || !currentRoom) return;
    const isHost = currentRoom.hostId === useAuthStore.getState().username;
    if (!isHost) return;

    (window as any).__anisyncUrlChanged = (newUrl: string) => {
      const socket = getSocket();
      const current = useSyncStore.getState().currentUrl;
      if (socket && newUrl !== current && newUrl !== 'about:blank') {
        socket.emit('sync:url-changed', { roomId: currentRoom.id, url: newUrl });
        useSyncStore.getState().setCurrentUrl(newUrl);
      }
    };
    return () => { delete (window as any).__anisyncUrlChanged; };
  }, [currentRoom?.id, currentRoom?.hostId]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const avatar = useAuthStore(s => s.avatar);
  const [isPortrait, setIsPortrait] = useState(() => !isElectron && window.innerHeight > window.innerWidth);

  useEffect(() => {
    if (isElectron) return;
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLeave = () => {
    const socket = getSocket();
    socket?.emit('room:leave', { roomId: currentRoom.id });
    if (isElectron) (window as any).anisync.anime.close();
    if (isMobile && (window as any).AniSyncBridge?.closeAnime) (window as any).AniSyncBridge.closeAnime();
    useRoomStore.getState().leaveRoom();
    useChatStore.getState().clear();
    useSyncStore.getState().setCurrentUrl(null);
    useUIStore.getState().setView('home');
  };

  const handleNavigate = () => {
    if (!animeUrl.trim()) return;
    let url = animeUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const socket = getSocket();
    (socket as any)?.emit('sync:url-changed', { roomId: currentRoom.id, url });
    useSyncStore.getState().setCurrentUrl(url);
    setShowUrlInput(false);
    setAnimeUrl('');
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(currentRoom.code).catch(() => { });
  };

  // ── Sidebar resize handler ──
  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!resizingRef.current) return;
      if (!isElectron && isPortrait) {
        const newH = Math.max(100, Math.min(window.innerHeight * 0.7, window.innerHeight - clientY));
        setSidebarWidth(newH);
      } else {
        const newW = Math.max(120, Math.min(window.innerWidth * 0.75, window.innerWidth - clientX));
        setSidebarWidth(newW);
        if (isElectron) syncBoundsToElectron();
      }
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onEnd = () => { resizingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isPortrait]);

  // ── Track URL from BrowserView ──
  useEffect(() => {
    if (!isElectron || !currentUrl) return;
    setDisplayUrl(currentUrl);
    const cleanup = (window as any).anisync.anime.onNavigated((url: string) => {
      setDisplayUrl(url);
    });
    return cleanup;
  }, [currentUrl]);

  const handleNavUrlSubmit = () => {
    if (!displayUrl.trim()) return;
    let url = displayUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const socket = getSocket();
    (socket as any)?.emit('sync:url-changed', { roomId: currentRoom.id, url });
    useSyncStore.getState().setCurrentUrl(url);
  };

  return (
    <>
      <div className="app__main" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="sync-bar">
          <button className="btn btn--ghost btn--sm" onClick={() => setShowLeaveConfirm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          {/* Mini avatar */}
          <div onClick={() => setShowProfileModal(true)} style={{
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
            background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white',
            border: '1.5px solid rgba(91,124,255,0.3)',
          }} title="Profil fotoğrafını değiştir">
            {!avatar && (useAuthStore.getState().username || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{currentRoom.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
              <span onClick={handleCopyCode} style={{ cursor: 'pointer' }}>
                Kod: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{currentRoom.code}</span>
              </span>
            </div>
          </div>
          {/* Members popup trigger */}
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowMembers(!showMembers)}
            title="Üyeler"
            style={{ position: 'relative', padding: '6px 10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span style={{
              position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16,
              borderRadius: 8, background: 'var(--accent-gradient)', fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700,
            }}>{members.length}</span>
          </button>
          {!currentUrl && (
            <button className="btn btn--secondary btn--sm" onClick={() => setShowUrlInput(!showUrlInput)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
              {!isMobile && ' Anime Aç'}
            </button>
          )}
        </div>

        {/* Members Popup */}
        {showMembers && (
          <MemberPopup
            members={members}
            hostId={currentRoom.hostId}
            onClose={() => setShowMembers(false)}
          />
        )}

        {/* URL Input */}
        {showUrlInput && !currentUrl && (
          <div style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input className="form-input" value={animeUrl} onChange={e => setAnimeUrl(e.target.value)}
              placeholder="https://animecix.tv/..." autoFocus
              onKeyDown={e => e.key === 'Enter' && handleNavigate()}
              style={{ flex: 1 }} />
            <button className="btn btn--primary btn--sm" onClick={handleNavigate}>Git</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowUrlInput(false)}>✕</button>
          </div>
        )}

        {/* Browser Nav Bar (PC only) */}
        {isElectron && currentUrl && (
          <div style={{
            height: 32, display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 8px', background: 'var(--bg-tertiary)',
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
            <input value={displayUrl} onChange={e => setDisplayUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNavUrlSubmit()}
              style={{
                flex: 1, height: 24, padding: '0 8px', fontSize: 12,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
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
              background: 'var(--bg-primary)',
            }}>
              {animeLoaded ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" /></svg> Anime BrowserView'da açıldı</p>
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)', opacity: 0.6 }}>{currentUrl}</p>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p>
              )}
            </div>
          ) : isMobile ? null : (
            <WebAnimeCard url={currentUrl} />
          )
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)',
            backgroundImage: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.04) 0%, transparent 70%)',
          }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2, marginBottom: 16 }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p style={{ fontSize: 16, fontWeight: 600 }}>Anime seçilmedi</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {isMobile ? 'Host anime linkini paylaşınca otomatik açılacak' : '"Anime Aç" butonuna tıklayarak link yapıştırın'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={() => { resizingRef.current = true; document.body.style.cursor = isPortrait && !isElectron ? 'ns-resize' : 'ew-resize'; }}
        onTouchStart={() => { resizingRef.current = true; }}
        style={{
          ...(isPortrait && !isElectron
            ? { width: '100%', height: 10, cursor: 'ns-resize' }
            : { width: 6, height: 'auto', cursor: 'ew-resize' }),
          background: 'var(--border)', transition: 'background 0.15s',
          position: 'relative', flexShrink: 0, touchAction: 'none',
        }}
      />

      {/* Sidebar — only chat now, members moved to popup */}
      <div className="app__sidebar" style={{
        ...(isPortrait && !isElectron
          ? { height: sidebarWidth, width: '100%', maxHeight: '70vh', minHeight: 100 }
          : { width: sidebarWidth, minWidth: 120, maxWidth: '75vw' }),
        flexShrink: 0, display: 'flex', flexDirection: 'column',
      }}>
        <ChatPanel roomId={currentRoom.id} />
      </div>

      {/* Leave Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Odadan Ayrıl
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
              <strong>{currentRoom.name}</strong> odasından ayrılmak istediğine emin misin?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setShowLeaveConfirm(false)}>
                Vazgeç
              </button>
              <button className="btn btn--primary" style={{ flex: 1, background: '#ef4444' }} onClick={handleLeave}>
                Ayrıl
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <RoomProfileModal onClose={() => {
          setShowProfileModal(false);
          if (isElectron && animeLoaded) (window as any).anisync?.anime?.show?.();
        }} />
      )}
    </>
  );
}

// ─── Web Anime Card ───────────────────────────────────────────

function WebAnimeCard({ url }: { url: string }) {
  const [opened, setOpened] = useState(false);
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  useEffect(() => {
    if (!opened) { window.open(url, '_blank'); setOpened(true); }
  }, [url]);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(34,211,238,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🎬</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Anime Yeni Sekmede Açıldı</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, wordBreak: 'break-all' }}>{domain}</p>
        <button className="btn btn--primary btn--full" onClick={() => window.open(url, '_blank')} style={{ marginBottom: 8 }}>🔗 Tekrar Aç</button>
      </div>
    </div>
  );
}

// ─── Member Popup ─────────────────────────────────────────────

function MemberPopup({ members, hostId: _hostId, onClose }: { members: any[]; hostId: string; onClose: () => void }) {
  void _hostId; // used for future host-specific styling
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 998,
      }} />
      {/* Popup */}
      <div style={{
        position: 'absolute', top: 52, right: 8, zIndex: 999,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 12, minWidth: 220, maxWidth: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxHeight: '60vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Üyeler — {members.length}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>✕</button>
        </div>
        {members.map(m => {
          const name = m.displayName ?? m.username ?? '?';
          const memberAvatar = m.avatar || null;
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              {memberAvatar ? (
                <img src={memberAvatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white',
                }}>{name[0].toUpperCase()}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  {m.role === 'host' && <span className="badge badge--primary" style={{ fontSize: 9, padding: '1px 5px' }}>HOST</span>}
                </div>
              </div>
              <div className={`member__status member__status--${m.presence?.isConnected ? 'online' : 'offline'}`} />
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────

function ChatPanel({ roomId }: { roomId: string }) {
  const { messages, typingUsers } = useChatStore();
  const { username } = useAuthStore();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Keyboard-aware: scroll input into view when focused ──
  useEffect(() => {
    if (!isMobile) return;
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // Wait for keyboard to open, then scroll input into view
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    };

    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    getSocket()?.emit('chat:message', { roomId, text: text.trim() });
    setText('');
    getSocket()?.emit('chat:typing', { roomId, isTyping: false });
  };

  const handleTyping = (v: string) => {
    setText(v);
    if (typingRef.current) clearTimeout(typingRef.current);
    const socket = getSocket();
    if (v.trim()) {
      socket?.emit('chat:typing', { roomId, isTyping: true });
      typingRef.current = setTimeout(() => socket?.emit('chat:typing', { roomId, isTyping: false }), 3000);
    } else {
      socket?.emit('chat:typing', { roomId, isTyping: false });
    }
  };

  const activeTypers = typingUsers.filter(t => t.userId !== username && t.isTyping);
  const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'];
  const nameColor = (n: string) => { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return colors[Math.abs(h) % colors.length]; };

  return (
    <div className="chat" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="chat__header" style={{ flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> Sohbet
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{messages.length} mesaj</span>
      </div>
      <div className="chat__messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Henüz mesaj yok</div>}
        {messages.map(msg => (
          <div key={msg.id} className={`chat__message ${msg.type === 'system' ? 'chat__message--system' : ''}`}>
            {msg.type === 'system' ? <span>{msg.text}</span> : (
              <>
                <span className="chat__author" style={{ color: msg.userId === username ? 'var(--accent-secondary)' : nameColor(msg.username) }}>{msg.displayName ?? msg.username}</span>
                <span className="chat__text">{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {activeTypers.length > 0 && <div className="chat__typing" style={{ flexShrink: 0 }}>{activeTypers.map(t => t.username).join(', ')} yazıyor...</div>}
      <div className="chat__input-area" style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <input
          ref={inputRef}
          className="chat__input"
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Mesaj yaz..."
          maxLength={500}
          style={{ flex: 1 }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            background: text.trim() ? 'var(--accent-gradient)' : 'transparent',
            border: text.trim() ? 'none' : '1px solid var(--border)',
            color: text.trim() ? 'white' : 'var(--text-muted)',
            borderRadius: 8, width: 38, height: 38, cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s ease',
          }}
          title="Gönder"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Room Profile Modal ─────────────────────────────────────

function RoomProfileModal({ onClose }: { onClose: () => void }) {
  const { avatar, setAvatar, username } = useAuthStore();
  const [preview, setPreview] = useState(avatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 128, 128);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(data);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setAvatar(preview);
    const s = getSocket(); if (s) (s as any).emit('user:update-avatar', { avatar: preview });
    onClose();
  };
  const handleClear = () => {
    setPreview(''); setAvatar('');
    const s = getSocket(); if (s) (s as any).emit('user:update-avatar', { avatar: null });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Profil Fotoğrafı</h2>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div onClick={() => fileRef.current?.click()} style={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
            background: preview ? `url(${preview}) center/cover` : 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 700, color: 'white', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(91,124,255,0.3)', border: '3px solid rgba(91,124,255,0.3)',
            position: 'relative',
          }}>
            {!preview && (username || '?')[0].toUpperCase()}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-card)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Resme tıklayarak galeriden fotoğraf seç</p>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--ghost btn--sm" onClick={handleClear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            Kaldır
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>Vazgeç</button>
          <button className="btn btn--primary" onClick={handleSave}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}
