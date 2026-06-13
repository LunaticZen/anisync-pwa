// ═══════════════════════════════════════════════════════════════
// Home Page — Main Menu (AniParty Reference Design)
// Profile · Create Room · Join Room · Ongoing Rooms
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore, useRoomStore, useSyncStore, useUIStore } from '../stores';
import { connectSocket, getSocket, getServerUrl, setServerUrl, warmUpServer } from '../services/socket';

const isElectron = !!(window as any).anisync;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && !isElectron;
const APP_VERSION = 'v1.1.1';

// ═══════════════════════════════════════════════════════════════
// AURA BACKGROUND (Gemini Style)
// ═══════════════════════════════════════════════════════════════
function AuraBackground() {
  return (
    <div className="gemini-aura-container">
      <div className="aura-blob aura-blob--1" />
      <div className="aura-blob aura-blob--2" />
      <div className="aura-blob aura-blob--3" />
    </div>
  );
}

export default function HomePage() {
  const username = useAuthStore(s => s.username);

  // If no username, show setup screen
  if (!username) return <UsernameSetup />;

  // Main menu
  return <MainMenu />;
}

// ═══════════════════════════════════════════════════════════════
// USERNAME SETUP — First time entry
// ═══════════════════════════════════════════════════════════════

function UsernameSetup() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      useAuthStore.getState().setUser(name.trim());
      const serverReady = await warmUpServer();
      if (!serverReady) {
        setError('Sunucuya ulaşılamıyor');
        setLoading(false);
        return;
      }
      connectSocket(name.trim());
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası');
      setLoading(false);
    }
  };

  return (
    <div className="main-menu">
      <AuraBackground />
      <div className="main-menu__inner" style={{ justifyContent: 'center', minHeight: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <div className="main-menu__logo" style={{ marginBottom: 32 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#lg1)" strokeWidth="1.5">
              <defs><linearGradient id="lg1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#5b7cff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>AniSync</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Hoş Geldin!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>Başlamak için bir takma ad seç</p>

          <div className="form-group">
            <input className="form-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Takma adını yaz" maxLength={20} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
              style={{ textAlign: 'center', fontSize: 18, fontWeight: 600 }} />
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

          <button className="btn btn--primary btn--full btn--lg" onClick={handleContinue}
            disabled={!name.trim() || loading}>
            {loading ? <><span className="spinner" /> Bağlanılıyor...</> : 'Devam Et'}
          </button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 20 }}>v{APP_VERSION}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN MENU — Profile, Create, Join, Ongoing Rooms
// ═══════════════════════════════════════════════════════════════

function MainMenu() {
  const username = useAuthStore(s => s.username);
  const avatar = useAuthStore(s => s.avatar);
  const isConnected = useAuthStore(s => s.isConnected);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [pendingRoom, setPendingRoom] = useState<any>(null); // waiting for approval
  const [serverUrl, setUrl] = useState(getServerUrl());
  const [saved, setSaved] = useState(false);

  // Auto-connect on mount
  useEffect(() => {
    if (!getSocket() && username) {
      warmUpServer().then(ok => {
        if (ok) connectSocket(username);
      });
    }
  }, []);

  // Load rooms when connected
  useEffect(() => {
    if (isConnected) loadRooms();
  }, [isConnected]);

  // PERF: Refresh rooms every 30s (was 10s), skip when app is in background
  useEffect(() => {
    if (!isConnected) return;
    const iv = setInterval(() => {
      if (!document.hidden) loadRooms();
    }, 30000);
    return () => clearInterval(iv);
  }, [isConnected]);

  // Listen for approval result to clear pending
  useEffect(() => {
    if (!pendingRoom) return;
    const socket = getSocket();
    if (!socket) return;
    const onApproved = () => setPendingRoom(null);
    const onRejected = () => setPendingRoom(null);
    (socket as any).on('room:join-approved', onApproved);
    (socket as any).on('room:join-rejected', onRejected);
    return () => {
      (socket as any).off('room:join-approved', onApproved);
      (socket as any).off('room:join-rejected', onRejected);
    };
  }, [pendingRoom]);

  const loadRooms = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('rooms:discover', { page: 1, pageSize: 20, sort: 'trending' }, (res: any) => {
      setPublicRooms(res.rooms ?? []);
    });
  };

  const handleRequestJoin = (room: any) => {
    const socket = getSocket();
    if (!socket) return;
    (socket as any).emit('room:request-join', { roomId: room.id }, (res: any) => {
      if (res.success) {
        setPendingRoom({ ...room, hostName: res.hostName, roomName: res.roomName || room.name });
      } else {
        useUIStore.getState().addToast({ type: 'error', title: 'Hata', message: res.error });
      }
    });
  };

  const handleCancelRequest = () => {
    if (pendingRoom) {
      const socket = getSocket();
      (socket as any)?.emit('room:cancel-request', { roomId: pendingRoom.id });
      setPendingRoom(null);
    }
  };

  const handleSaveUrl = () => {
    const url = serverUrl.trim();
    if (url) {
      setServerUrl(url.startsWith('http') ? url : 'https://' + url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // ── Pending Approval Screen ──
  if (pendingRoom) {
    return (
      <div className="main-menu">
        <AuraBackground />
        <div className="main-menu__inner" style={{ justifyContent: 'center', minHeight: '100%' }}>
          <div style={{ textAlign: 'center', maxWidth: 340, margin: '0 auto' }}>
            <div className="approval-spinner">
              <div className="approval-spinner__ring" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Onay Bekleniyor</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{pendingRoom.roomName || pendingRoom.name}</strong> odasına katılma isteğin gönderildi
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
              Host ({pendingRoom.hostName || pendingRoom.hostId}) onaylamasını bekliyorsun...
            </p>
            <button className="btn btn--secondary btn--full" onClick={handleCancelRequest}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Vazgeç
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 20 }}>v{APP_VERSION}</div>
      </div>
    );
  }

  // ── Main Menu Layout ──
  return (
    <div className="main-menu">
      <AuraBackground />
      <div className="main-menu__inner">
        {/* Logo + Settings */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
          <div className="main-menu__logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#lg2)" strokeWidth="1.5">
              <defs><linearGradient id="lg2" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#5b7cff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>AniSync</span>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            padding: 8, borderRadius: 12, display: 'flex', transition: 'color 0.2s',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Settings panel (hidden by default) */}
        {showSettings && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid var(--border)', flexShrink: 0 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Sunucu Adresi</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={serverUrl} onChange={e => setUrl(e.target.value)}
                placeholder="https://anisync-xxxx.onrender.com" style={{ fontSize: 12, flex: 1, padding: '8px 12px' }} />
              <button className="btn btn--primary btn--sm" onClick={handleSaveUrl} style={{ whiteSpace: 'nowrap' }}>
                {saved ? '✓' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}

        {/* Profile Section */}
        <div className="profile-section" onClick={() => setShowProfile(true)}>
          <div className="profile-section__avatar">
            {avatar ? (
              <img src={avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span>{(username || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="profile-section__name">{username}</div>
          <button className="btn btn--ghost btn--sm" style={{ fontSize: 12, gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Profili Düzenle
          </button>
          {!isConnected && (
            <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="spinner" style={{ width: 10, height: 10 }} /> Bağlanılıyor...
            </div>
          )}
        </div>

        {/* Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, flexShrink: 0 }}>
          <div className="action-card action-card--primary" onClick={() => setShowCreate(true)}>
            <div className="action-card__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div>
              <div className="action-card__title">Oda Oluştur</div>
              <div className="action-card__desc">Özel izleme odası aç</div>
            </div>
          </div>
          <div className="action-card action-card--secondary" onClick={() => setShowJoin(true)}>
            <div className="action-card__icon action-card__icon--secondary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            </div>
            <div>
              <div className="action-card__title">Odaya Katıl</div>
              <div className="action-card__desc">Davet koduyla katıl</div>
            </div>
          </div>
        </div>

        {/* Ongoing Rooms */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Ongoing Rooms</h3>
            <button className="btn btn--ghost btn--sm" onClick={loadRooms} style={{ padding: '4px 8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--border)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 8 }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <p style={{ fontSize: 13 }}>Henüz açık oda yok</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>İlk odayı sen oluştur!</p>
            </div>
          ) : (
            <div className="ongoing-scroll">
              {publicRooms.map(room => (
                <OngoingRoomCard key={room.id} room={room} onRequestJoin={handleRequestJoin} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacer for safe area */}
        <div style={{ height: 'max(16px, env(safe-area-inset-bottom, 16px))', flexShrink: 0 }} />
      </div>

      {/* Modals */}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
      {showProfile && <ProfileEditModal onClose={() => setShowProfile(false)} />}
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none', zIndex: 20 }}>v{APP_VERSION}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGOING ROOM CARD
// ═══════════════════════════════════════════════════════════════

function OngoingRoomCard({ room, onRequestJoin }: { room: any; onRequestJoin: (r: any) => void }) {
  return (
    <div className="ongoing-card" onClick={() => onRequestJoin(room)}>
      <div className="ongoing-card__header">
        <div className="ongoing-card__name">{room.name}</div>
        <span className="ongoing-card__live">CANLI</span>
      </div>
      <div className="ongoing-card__meta">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <span>{room.memberCount}/{room.maxMembers}</span>
      </div>
      <div className="ongoing-card__host">
        {room.hostAvatar ? (
          <img src={room.hostAvatar} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white',
          }}>{(room.hostName || '?')[0].toUpperCase()}</div>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room.hostName}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE ROOM MODAL
// ═══════════════════════════════════════════════════════════════

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const username = useAuthStore(s => s.username);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      let socket = getSocket();
      if (!socket) {
        setStatus('Sunucu ile bağlantı kuruluyor...');
        const serverReady = await warmUpServer();
        if (!serverReady) { setError('Sunucuya ulaşılamıyor'); setLoading(false); setStatus(''); return; }
        setStatus('Bağlanılıyor...');
        socket = connectSocket(username);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Bağlantı zaman aşımı')), 25000);
          socket!.on('connect', () => { clearTimeout(timeout); resolve(); });
          if (socket!.connected) { clearTimeout(timeout); resolve(); }
        });
      }
      setStatus('Oda oluşturuluyor...');
      socket.emit('room:create', { name: name.trim(), isPublic: true, maxMembers: 10 }, (res: any) => {
        setLoading(false); setStatus('');
        if (res.success && res.room) {
          useRoomStore.getState().setRoom(res.room);
          useUIStore.getState().setView('room');
          useUIStore.getState().addToast({ type: 'success', title: 'Oda oluşturuldu!' });
          onClose();
        } else { setError(res.error ?? 'Oda oluşturulamadı'); }
      });
    } catch (err: any) { setLoading(false); setStatus(''); setError(err.message ?? 'Bağlantı hatası'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Oda Oluştur</h2>
        <div className="form-group">
          <label className="form-label">Oda Adı</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ör: One Piece İzliyoruz" maxLength={50} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        </div>
        {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn--primary" onClick={handleCreate} disabled={!name.trim() || loading} style={{ flex: 1 }}>
            {loading ? <><span className="spinner" /> {status && <span style={{ marginLeft: 6, fontSize: 12 }}>{status}</span>}</> : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOIN ROOM MODAL (code-based, no approval needed)
// ═══════════════════════════════════════════════════════════════

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const username = useAuthStore(s => s.username);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      let socket = getSocket();
      if (!socket) {
        setStatus('Sunucu ile bağlantı kuruluyor...');
        const serverReady = await warmUpServer();
        if (!serverReady) { setError('Sunucuya ulaşılamıyor'); setLoading(false); setStatus(''); return; }
        setStatus('Bağlanılıyor...');
        socket = connectSocket(username);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Bağlantı zaman aşımı')), 25000);
          socket!.on('connect', () => { clearTimeout(timeout); resolve(); });
          if (socket!.connected) { clearTimeout(timeout); resolve(); }
        });
      }
      setStatus('Odaya katılınıyor...');
      socket.emit('room:join', { code: code.trim().toUpperCase() }, (res: any) => {
        setLoading(false); setStatus('');
        if (res.success && res.room) {
          useRoomStore.getState().setRoom(res.room);
          if (res.syncState) useSyncStore.getState().setSyncState(res.syncState);
          if (res.currentUrl) useSyncStore.getState().setCurrentUrl(res.currentUrl);
          useUIStore.getState().setView('room');
          onClose();
        } else { setError(res.error ?? 'Katılma başarısız'); }
      });
    } catch (err: any) { setLoading(false); setStatus(''); setError(err.message ?? 'Bağlantı hatası'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Odaya Katıl</h2>
        <div className="form-group">
          <label className="form-label">Oda Kodu</label>
          <input className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF" maxLength={8} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 24, textAlign: 'center', letterSpacing: 6 }} />
        </div>
        {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn--primary" onClick={handleJoin} disabled={!code.trim() || loading} style={{ flex: 1 }}>
            {loading ? <><span className="spinner" /> {status && <span style={{ marginLeft: 6, fontSize: 12 }}>{status}</span>}</> : 'Katıl'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE EDIT MODAL — Avatar + Username
// ═══════════════════════════════════════════════════════════════

function ProfileEditModal({ onClose }: { onClose: () => void }) {
  const { avatar, setAvatar, username } = useAuthStore();
  const [preview, setPreview] = useState(avatar);
  const [newUsername, setNewUsername] = useState(username);
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
        setPreview(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Save avatar
    setAvatar(preview);
    const s = getSocket();
    if (s) (s as any).emit('user:update-avatar', { avatar: preview || null });

    // Save username if changed
    if (newUsername.trim() && newUsername.trim() !== username) {
      useAuthStore.getState().setUser(newUsername.trim());
      if (s) (s as any).emit('user:update-username', { username: newUsername.trim() });
    }
    onClose();
  };

  const handleClear = () => {
    setPreview('');
    setAvatar('');
    const s = getSocket();
    if (s) (s as any).emit('user:update-avatar', { avatar: null });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Profili Düzenle</h2>

        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div onClick={() => fileRef.current?.click()} style={{
            width: 90, height: 90, borderRadius: '50%', margin: '0 auto 14px',
            background: preview ? `url(${preview}) center/cover` : 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'white', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(91,124,255,0.3)', border: '3px solid rgba(91,124,255,0.3)',
            position: 'relative',
          }}>
            {!preview && (username || '?')[0].toUpperCase()}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%',
              background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-card)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Resme tıklayarak fotoğraf seç</p>
        </div>

        {/* Username */}
        <div className="form-group">
          <label className="form-label">Kullanıcı Adı</label>
          <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)}
            placeholder="Takma adın" maxLength={20}
            style={{ textAlign: 'center', fontSize: 16, fontWeight: 600 }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--ghost btn--sm" onClick={handleClear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
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
