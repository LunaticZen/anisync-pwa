// ═══════════════════════════════════════════════════════════════
// Home Page — No auth, just Create or Join a Room with a name
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuthStore, useRoomStore, useSyncStore, useUIStore } from '../stores';
import { connectSocket, getSocket, getServerUrl, setServerUrl, warmUpServer } from '../services/socket';

export default function HomePage() {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');

  return (
    <div className="auth-page">
      {view === 'home' && <HomeCard onView={setView} />}
      {view === 'create' && <CreateCard onBack={() => setView('home')} />}
      {view === 'join' && <JoinCard onBack={() => setView('home')} />}
    </div>
  );
}

// ─── Home Card ────────────────────────────────────────────────

function HomeCard({ onView }: { onView: (v: 'create' | 'join') => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setUrl] = useState(getServerUrl());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const url = serverUrl.trim();
    if (url) {
      setServerUrl(url.startsWith('http') ? url : 'https://' + url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="auth-card" style={{ textAlign: 'center' }}>
      <h1 className="auth-card__title">AniSync</h1>
      <p className="auth-card__subtitle">Anime birlikte izleme platformu</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
        <button className="btn btn--primary btn--lg btn--full" onClick={() => onView('create')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Oda Oluştur
        </button>
        <button className="btn btn--secondary btn--lg btn--full" onClick={() => onView('join')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          Odaya Katıl
        </button>
      </div>

      {/* Server Settings Toggle */}
      <button
        className="btn btn--ghost btn--sm"
        onClick={() => setShowSettings(!showSettings)}
        style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}
      >
        ⚙️ Sunucu Ayarları
      </button>

      {showSettings && (
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          <label className="form-label" style={{ fontSize: 12 }}>Sunucu Adresi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              value={serverUrl}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://anisync-xxxx.onrender.com"
              style={{ fontSize: 13, flex: 1 }}
            />
            <button className="btn btn--primary btn--sm" onClick={handleSave} style={{ whiteSpace: 'nowrap' }}>
              {saved ? '✓' : 'Kaydet'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Render.com URL'nizi girin veya localhost:3000 bırakın
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Create Room Card ─────────────────────────────────────────

function CreateCard({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleCreate = async () => {
    if (!username.trim() || !roomName.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Set identity
      useAuthStore.getState().setUser(username.trim());

      // Warm up server (handles cold start)
      setStatus('Sunucu ile bağlantı kuruluyor...');
      const serverReady = await warmUpServer();
      if (!serverReady) {
        setStatus('');
        setLoading(false);
        setError('Sunucuya ulaşılamıyor. Lütfen sunucu adresini kontrol edin.');
        return;
      }

      // Connect socket with username
      setStatus('Bağlanılıyor...');
      const socket = connectSocket(username.trim());

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Bağlantı zaman aşımı')), 25000);
        socket.on('connect', () => { clearTimeout(timeout); resolve(); });
        if (socket.connected) { clearTimeout(timeout); resolve(); }
      });

      // Create room
      setStatus('Oda oluşturuluyor...');
      socket.emit('room:create', {
        name: roomName.trim(),
        isPublic: true,
        maxMembers: 10,
      }, (res: any) => {
        setLoading(false);
        setStatus('');
        if (res.success && res.room) {
          useRoomStore.getState().setRoom(res.room);
          useUIStore.getState().setView('room');
          useUIStore.getState().addToast({ type: 'success', title: 'Oda oluşturuldu!' });
        } else {
          setError(res.error ?? 'Oda oluşturulamadı');
        }
      });
    } catch (err: any) {
      setLoading(false);
      setStatus('');
      setError(err.message ?? 'Bağlantı hatası');
    }
  };

  return (
    <div className="auth-card">
      <button className="btn btn--ghost btn--sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Geri
      </button>
      <h1 className="auth-card__title">Oda Oluştur</h1>
      <p className="auth-card__subtitle">İsim seç ve oda aç</p>

      <div className="form-group">
        <label className="form-label">Senin Adın</label>
        <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="Takma adını yaz" maxLength={20} autoFocus />
      </div>

      <div className="form-group">
        <label className="form-label">Oda Adı</label>
        <input className="form-input" value={roomName} onChange={e => setRoomName(e.target.value)}
          placeholder="Ör: One Piece İzliyoruz" maxLength={50}
          onKeyDown={e => e.key === 'Enter' && handleCreate()} />
      </div>

      {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <button className="btn btn--primary btn--full btn--lg" onClick={handleCreate}
        disabled={!username.trim() || !roomName.trim() || loading}>
        {loading ? <><span className="spinner" /> {status && <span style={{ marginLeft: 8, fontSize: 13 }}>{status}</span>}</> : 'Oluştur'}
      </button>
    </div>
  );
}

// ─── Join Room Card ───────────────────────────────────────────

function JoinCard({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleJoin = async () => {
    if (!username.trim() || !code.trim()) return;
    setLoading(true);
    setError('');

    try {
      useAuthStore.getState().setUser(username.trim());

      // Warm up server (handles cold start)
      setStatus('Sunucu ile bağlantı kuruluyor...');
      const serverReady = await warmUpServer();
      if (!serverReady) {
        setStatus('');
        setLoading(false);
        setError('Sunucuya ulaşılamıyor. Lütfen sunucu adresini kontrol edin.');
        return;
      }

      setStatus('Bağlanılıyor...');
      const socket = connectSocket(username.trim());

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Bağlantı zaman aşımı')), 25000);
        socket.on('connect', () => { clearTimeout(timeout); resolve(); });
        if (socket.connected) { clearTimeout(timeout); resolve(); }
      });

      setStatus('Odaya katılınıyor...');
      socket.emit('room:join', { code: code.trim().toUpperCase() }, (res: any) => {
        setLoading(false);
        setStatus('');
        if (res.success && res.room) {
          useRoomStore.getState().setRoom(res.room);
          if (res.syncState) useSyncStore.getState().setSyncState(res.syncState);
          if (res.currentUrl) useSyncStore.getState().setCurrentUrl(res.currentUrl);
          useUIStore.getState().setView('room');
        } else {
          setError(res.error ?? 'Katılma başarısız');
        }
      });
    } catch (err: any) {
      setLoading(false);
      setStatus('');
      setError(err.message ?? 'Bağlantı hatası');
    }
  };

  return (
    <div className="auth-card">
      <button className="btn btn--ghost btn--sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Geri
      </button>
      <h1 className="auth-card__title">Odaya Katıl</h1>
      <p className="auth-card__subtitle">İsim seç ve oda kodunu gir</p>

      <div className="form-group">
        <label className="form-label">Senin Adın</label>
        <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="Takma adını yaz" maxLength={20} autoFocus />
      </div>

      <div className="form-group">
        <label className="form-label">Oda Kodu</label>
        <input className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDEF" maxLength={8}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 20, textAlign: 'center', letterSpacing: 4 }} />
      </div>

      {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <button className="btn btn--primary btn--full btn--lg" onClick={handleJoin}
        disabled={!username.trim() || !code.trim() || loading}>
        {loading ? <><span className="spinner" /> {status && <span style={{ marginLeft: 8, fontSize: 13 }}>{status}</span>}</> : 'Katıl'}
      </button>
    </div>
  );
}
