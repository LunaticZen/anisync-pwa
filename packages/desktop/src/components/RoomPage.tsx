// ═══════════════════════════════════════════════════════════════
// Room Page — Active Watch Party View
// Player area + Sidebar (Members + Chat + Sync Controls)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore, useRoomStore, useSyncStore, useChatStore, useUIStore } from '../stores';
import { getSocket } from '../services/socket';

export default function RoomPage() {
  const { currentRoom, members } = useRoomStore();
  const { user } = useAuthStore();
  const { syncState } = useSyncStore();
  const [animeUrl, setAnimeUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === user?.id;

  const handleLeave = () => {
    const socket = getSocket();
    socket?.emit('room:leave', { roomId: currentRoom.id });
    useRoomStore.getState().leaveRoom();
    useChatStore.getState().clear();
    useUIStore.getState().setView('lobby');
  };

  const handleNavigate = () => {
    if (!animeUrl.trim()) return;
    window.anisync?.anime.navigate(animeUrl);
    setShowUrlInput(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    useUIStore.getState().addToast({ type: 'success', title: 'Kod kopyalandı', message: currentRoom.code, duration: 2000 });
  };

  return (
    <>
      {/* Main Content Area */}
      <div className="app__main" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Room Header Bar */}
        <div className="sync-bar">
          <button className="btn btn--ghost btn--sm" onClick={handleLeave} title="Odadan ayrıl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{currentRoom.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span onClick={handleCopyCode} style={{ cursor: 'pointer' }} title="Kodu kopyala">
                Kod: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>{currentRoom.code}</span>
              </span>
              <span>👥 {members.length}/{currentRoom.maxMembers}</span>
            </div>
          </div>

          <SyncIndicator />

          <button className="btn btn--secondary btn--sm" onClick={() => setShowUrlInput(!showUrlInput)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
            Anime Aç
          </button>

          {isHost && (
            <SyncControls roomId={currentRoom.id} />
          )}
        </div>

        {/* URL Input Bar */}
        {showUrlInput && (
          <div style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input className="form-input" value={animeUrl} onChange={e => setAnimeUrl(e.target.value)}
              placeholder="https://turkanime.co/video/..." autoFocus
              onKeyDown={e => e.key === 'Enter' && handleNavigate()}
              style={{ flex: 1 }} />
            <button className="btn btn--primary btn--sm" onClick={handleNavigate}>Git</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowUrlInput(false)}>✕</button>
          </div>
        )}

        {/* Player Area (BrowserView renders here in Electron) */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary)',
          backgroundImage: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.04) 0%, transparent 70%)',
        }}>
          {syncState?.anime ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {syncState.anime.title}
              </p>
              <p>Bölüm: {syncState.anime.episode}</p>
              <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
                Player bu alanda görüntülenir (Electron BrowserView)
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2, marginBottom: 16 }}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <p style={{ fontSize: 16, fontWeight: 600 }}>Anime seçilmedi</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>"Anime Aç" butonuna tıklayarak bir anime sayfası açın</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="app__sidebar">
        <MemberList members={members} hostId={currentRoom.hostId} />
        <ChatPanel roomId={currentRoom.id} />
      </div>
    </>
  );
}

// ─── Sync Indicator ───────────────────────────────────────────

function SyncIndicator() {
  const { isSynced, syncState, lastDriftMs } = useSyncStore();

  return (
    <div className={`sync-indicator ${isSynced ? 'sync-indicator--synced' : 'sync-indicator--desynced'}`}>
      <div className="sync-indicator__dot" />
      <span>{isSynced ? 'Senkron' : `Desync ${Math.round(lastDriftMs)}ms`}</span>
      {syncState && (
        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 11 }}>
          {syncState.isPlaying ? '▶' : '⏸'} {formatTime(syncState.currentTime)}
        </span>
      )}
    </div>
  );
}

// ─── Sync Controls ────────────────────────────────────────────

function SyncControls({ roomId }: { roomId: string }) {
  const { syncState } = useSyncStore();
  const socket = getSocket();

  const emitSync = (type: string) => {
    if (!socket || !syncState) return;
    const gen = syncState.generation + 1;
    const time = syncState.currentTime;

    if (type === 'play') {
      socket.emit('sync:play', { roomId, time, generation: gen });
    } else if (type === 'pause') {
      socket.emit('sync:pause', { roomId, time, generation: gen });
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn--ghost btn--sm" onClick={() => emitSync(syncState?.isPlaying ? 'pause' : 'play')} title={syncState?.isPlaying ? 'Duraklat' : 'Oynat'}>
        {syncState?.isPlaying ? '⏸' : '▶️'}
      </button>
    </div>
  );
}

// ─── Member List ──────────────────────────────────────────────

function MemberList({ members, hostId }: { members: any[]; hostId: string }) {
  return (
    <div className="members">
      <div className="members__title">Üyeler — {members.length}</div>
      {members.map(m => (
        <div key={m.userId} className="member">
          <div className="member__avatar">{(m.displayName ?? m.username ?? '?')[0].toUpperCase()}</div>
          <div>
            <div className="member__name">
              {m.displayName ?? m.username}
              {m.userId === hostId && <span className="badge badge--host" style={{ marginLeft: 6 }}>HOST</span>}
              {m.role === 'moderator' && <span className="badge badge--mod" style={{ marginLeft: 6 }}>MOD</span>}
            </div>
          </div>
          <div className={`member__status member__status--${m.presence?.isConnected ? (m.presence.isBuffering ? 'buffering' : 'online') : 'offline'}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────

function ChatPanel({ roomId }: { roomId: string }) {
  const { messages, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    const socket = getSocket();
    socket?.emit('chat:message', { roomId, text: text.trim() });
    setText('');

    // Stop typing
    socket?.emit('chat:typing', { roomId, isTyping: false });
  };

  const handleTyping = (value: string) => {
    setText(value);
    const socket = getSocket();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (value.trim()) {
      socket?.emit('chat:typing', { roomId, isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:typing', { roomId, isTyping: false });
      }, 3000);
    } else {
      socket?.emit('chat:typing', { roomId, isTyping: false });
    }
  };

  const activeTypers = typingUsers.filter(t => t.userId !== user?.id && t.isTyping);

  return (
    <div className="chat">
      <div className="chat__header">
        <span>💬 Sohbet</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{messages.length} mesaj</span>
      </div>

      <div className="chat__messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
            Henüz mesaj yok. İlk mesajı yaz! 💬
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat__message ${msg.type === 'system' ? 'chat__message--system' : ''}`}>
            {msg.type === 'system' ? (
              <span>{msg.text}</span>
            ) : (
              <>
                <span className="chat__author" style={{
                  color: msg.userId === user?.id ? 'var(--accent-secondary)' : getNameColor(msg.username),
                }}>
                  {msg.displayName ?? msg.username}
                </span>
                <span className="chat__text">{msg.text}</span>
                <span className="chat__time">{formatMessageTime(msg.createdAt)}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {activeTypers.length > 0 && (
        <div className="chat__typing">
          {activeTypers.map(t => t.username).join(', ')} yazıyor...
        </div>
      )}

      <div className="chat__input-area">
        <input
          className="chat__input"
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Mesaj yaz..."
          maxLength={500}
        />
      </div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ''; }
}

const NAME_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'];
function getNameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}
