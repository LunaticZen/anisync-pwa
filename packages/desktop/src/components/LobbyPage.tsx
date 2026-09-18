// ═══════════════════════════════════════════════════════════════
// Lobby Page — Room Discovery, Create & Join
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, useRoomStore, useUIStore, useChatStore, useSyncStore } from '../stores';
import { getSocket, disconnectSocket } from '../services/socket';

export default function LobbyPage() {
  const { user } = useAuthStore();
  const avatar = useAuthStore(s => s.avatar);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);



  useEffect(() => {
    loadPublicRooms();
  }, []);

  const loadPublicRooms = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('rooms:discover', { page: 1, pageSize: 20, sort: 'trending' }, (res) => {
      setPublicRooms(res.rooms ?? []);
    });
  };

  const handleLogout = () => {
    disconnectSocket();
    useAuthStore.getState().logout();
    useUIStore.getState().setView('login');
  };

  return (
    <div className="app__main">
      <div className="lobby">
        <div className="lobby__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Profile avatar */}
            <div onClick={() => setShowProfile(true)} style={{
              width: 48, height: 48, borderRadius: '50%', cursor: 'pointer',
              background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
              boxShadow: '0 0 20px rgba(91,124,255,0.25)',
              border: '2px solid rgba(91,124,255,0.3)',
              transition: 'transform 0.2s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {!avatar && (user?.displayName ?? user?.username ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="lobby__title">
                Merhaba, <span className="text-gradient">{user?.displayName ?? user?.username}</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
                Bir odaya katıl veya yeni oda oluştur
              </p>
            </div>
          </div>
          <div className="lobby__actions">

            <button className="btn btn--secondary btn--sm" onClick={handleLogout}>Çıkış</button>
            <button className="btn btn--secondary" onClick={() => setShowJoin(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
              Odaya Katıl
            </button>
            <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              Oda Oluştur
            </button>
          </div>
        </div>

        {/* Public Rooms */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Açık Odalar</h2>
            <button className="btn btn--ghost btn--sm" onClick={loadPublicRooms}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
              Yenile
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <p>Henüz açık oda yok</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>İlk odayı sen oluştur!</p>
            </div>
          ) : (
            <div className="room-grid">
              {publicRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

// ─── Room Card ────────────────────────────────────────────────

function RoomCard({ room }: { room: any }) {
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    const socket = getSocket();
    if (!socket || joining) return;
    setJoining(true);

    // Timeout protection: Xiaomi WebView sometimes drops socket.emit callbacks
    let responded = false;
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        setJoining(false);
        useUIStore.getState().addToast({
          type: 'warning',
          title: 'Bağlantı yavaş',
          message: `Yanıt alınamadı. Oda kodu ile dene: ${room.code}`,
          duration: 8000,
        });
      }
    }, 8000);

    socket.emit('room:join', { code: room.code }, (res: any) => {
      if (responded) return; // Already timed out
      responded = true;
      clearTimeout(timeout);
      setJoining(false);

      if (res?.success && res?.room) {
        useRoomStore.getState().setRoom(res.room);
        if (res.syncState) useSyncStore.getState().setSyncState(res.syncState);
        if (res.currentUrl) useSyncStore.getState().setCurrentUrl(res.currentUrl);
        useUIStore.getState().setView('room');
      } else {
        useUIStore.getState().addToast({
          type: 'error',
          title: 'Katılma başarısız',
          message: res?.error || `Oda kodu ile dene: ${room.code}`,
        });
      }
    });
  };

  return (
    <div className="room-card" onClick={handleJoin} style={{ opacity: joining ? 0.6 : 1, pointerEvents: joining ? 'none' : 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div className="room-card__name">{room.name}</div>
        <span className={`room-card__badge room-card__badge--${room.isPublic ? 'public' : 'private'}`}>
          {room.isPublic ? 'Açık' : 'Özel'}
        </span>
      </div>
      <div className="room-card__info">
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> {room.memberCount ?? 0}/{room.maxMembers ?? 10}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></svg> {room.currentAnime?.title ?? 'Anime seçilmedi'}</span>
      </div>
      {room.hostName && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Host: {room.hostName}
        </div>
      )}
      {joining && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="spinner" style={{ width: 12, height: 12 }} /> Katılınıyor...
        </div>
      )}
    </div>
  );
}

// ─── Create Room Modal ────────────────────────────────────────

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    const socket = getSocket();
    if (!socket || !name.trim()) return;
    setLoading(true);

    socket.emit('room:create', {
      name: name.trim(),
      isPublic,
      password: password || undefined,
      maxMembers,
      videoUrl: videoUrl.trim() || undefined,
    }, (res) => {
      setLoading(false);
      if (res.success && res.room) {
        useRoomStore.getState().setRoom(res.room);
        if (videoUrl.trim()) {
          useSyncStore.getState().setCurrentUrl(videoUrl.trim());
        }
        useUIStore.getState().setView('room');
        useUIStore.getState().addToast({ type: 'success', title: 'Oda oluşturuldu!' });
        onClose();
      } else {
        useUIStore.getState().addToast({ type: 'error', title: 'Hata', message: res.error });
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Yeni Oda Oluştur</h2>

        <div className="form-group">
          <label className="form-label">Oda Adı</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ör: One Piece İzliyoruz" maxLength={50} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Oda Tipi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${isPublic ? 'btn--primary' : 'btn--secondary'} btn--sm`}
              onClick={() => setIsPublic(true)} type="button">Açık</button>
            <button className={`btn ${!isPublic ? 'btn--primary' : 'btn--secondary'} btn--sm`}
              onClick={() => setIsPublic(false)} type="button">Özel</button>
          </div>
        </div>

        {!isPublic && (
          <div className="form-group">
            <label className="form-label">Şifre (Opsiyonel)</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Oda şifresi" />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">MP4 Video URL (Opsiyonel)</label>
          <input className="form-input" type="url" value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4" />
        </div>

        <div className="form-group">
          <label className="form-label">Maks Üye: {maxMembers}</label>
          <input type="range" min={2} max={20} value={maxMembers}
            onChange={e => setMaxMembers(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn--primary" onClick={handleCreate} disabled={!name.trim() || loading}
            style={{ flex: 1 }}>
            {loading ? <span className="spinner" /> : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Join Room Modal ──────────────────────────────────────────

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = () => {
    const socket = getSocket();
    if (!socket || !code.trim()) return;
    setLoading(true);
    setError('');

    socket.emit('room:join', { code: code.trim().toUpperCase(), password: password || undefined }, (res) => {
      setLoading(false);
      if (res.success && res.room) {
        useRoomStore.getState().setRoom(res.room);
        if (res.syncState) useSyncStore.getState().setSyncState(res.syncState);
        useUIStore.getState().setView('room');
        onClose();
      } else {
        if (res.error?.includes('şifre') || res.error?.includes('PASSWORD')) {
          setNeedsPassword(true);
        }
        setError(res.error ?? 'Katılma başarısız');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Odaya Katıl</h2>

        <div className="form-group">
          <label className="form-label">Oda Kodu</label>
          <input className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF" maxLength={8} autoFocus
            style={{ fontFamily: 'var(--font-mono)', fontSize: 20, textAlign: 'center', letterSpacing: 4 }} />
        </div>

        {needsPassword && (
          <div className="form-group">
            <label className="form-label">Oda Şifresi</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Şifre" />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn--secondary" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn--primary" onClick={handleJoin} disabled={!code.trim() || loading}
            style={{ flex: 1 }}>
            {loading ? <span className="spinner" /> : 'Katıl'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Modal ─────────────────────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
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
        setPreview(canvas.toDataURL('image/jpeg', 0.8));
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
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
              background: preview ? `url(${preview}) center/cover` : 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: 'white', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(91,124,255,0.3)',
              border: '3px solid rgba(91,124,255,0.3)',
              transition: 'transform 0.2s ease',
              position: 'relative' as const,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {!preview && (username || '?')[0].toUpperCase()}
            <div style={{
              position: 'absolute' as const, bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-card)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Resme tıklayarak galeriden fotoğraf seç
          </p>
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
