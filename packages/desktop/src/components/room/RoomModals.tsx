// ═══════════════════════════════════════════════════════════════
// Room — Modals & Popups
// MemberPopup, MemberList, LeaveConfirmModal, RoomProfileModal, ThemePickerPopup
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { useAuthStore, useRoomStore } from '../../stores';
import { getSocket } from '../../services/socket';
import { THEMES, IMAGE_THEMES, IMAGE_THEME_CATEGORIES, getTheme, avatarColor, isMobile, type RoomMode } from './constants';

// ─── Member Popup (Mobile) ────────────────────────────────────────
export function MemberPopup({ members, onClose, pendingRequests, hostId }: { members: any[]; onClose: () => void; pendingRequests?: any[]; hostId?: string }) {
  const myUsername = useAuthStore(s => s.username);
  const isHost = myUsername === hostId;
  const roomTheme = useRoomStore(s => s.theme);
  const activeTheme = getTheme(roomTheme);

  const handleApprove = (req: any) => {
    const socket = getSocket();
    (socket as any)?.emit('room:approve-join', { roomId: req.roomId, userId: req.userId });
    useRoomStore.getState().removePendingRequest(req.userId);
  };
  const handleReject = (req: any) => {
    const socket = getSocket();
    (socket as any)?.emit('room:reject-join', { roomId: req.roomId, userId: req.userId });
    useRoomStore.getState().removePendingRequest(req.userId);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
      <div style={{
        position: 'absolute', top: 48, right: 8, zIndex: 999,
        background: activeTheme.isLight ? activeTheme.menuBg : (activeTheme.isImage ? activeTheme.menuBg : '#1a1a3e'),
        backdropFilter: activeTheme.isImage ? 'blur(20px) saturate(1.3)' : 'none',
        border: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12, padding: '8px 0', minWidth: 220, maxWidth: 300,
        boxShadow: activeTheme.isLight ? '0 12px 40px rgba(0,0,0,0.15)' : '0 12px 40px rgba(0,0,0,0.5)',
        maxHeight: '50vh', overflowY: 'auto',
        color: activeTheme.textColor,
        animation: 'modalPopJuicy 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        transformOrigin: 'top right',
      }}>
        {/* Pending requests for host */}
        {isHost && pendingRequests && pendingRequests.length > 0 && (
          <>
            <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: 1, textTransform: 'uppercase' as const }}>
              Katılma İstekleri
            </div>
            {pendingRequests.map(req => (
              <div key={req.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px' }}>
                {req.avatar ? (
                  <img src={req.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white',
                  }}>{(req.username || '?')[0].toUpperCase()}</div>
                )}
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{req.username}</div>
                <button onClick={() => handleApprove(req)} style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(34,197,94,0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Onayla">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button onClick={() => handleReject(req)} style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Reddet">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <div style={{ height: 1, background: activeTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', margin: '4px 14px' }} />
          </>
        )}

        {/* Members list */}
        <div style={{ padding: '4px 14px 2px', fontSize: 10, fontWeight: 700, color: activeTheme.isLight ? '#94a3b8' : '#64748b', letterSpacing: 1, textTransform: 'uppercase' as const }}>
          Üyeler — {members.length}
        </div>
        {members.map(m => {
          const name = m.displayName ?? m.username ?? '?';
          const memberAvatar = m.avatar || null;
          const clr = avatarColor(name);
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
              {memberAvatar ? (
                <img src={memberAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: clr, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white',
                }}>{name[0].toUpperCase()}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                {m.role === 'host' && <span style={{ fontSize: 10, color: '#5b7cff', fontWeight: 700 }}>HOST</span>}
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: m.presence?.isConnected ? '#22c55e' : '#475569',
                boxShadow: m.presence?.isConnected ? '0 0 8px #22c55e' : 'none',
              }} />
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Member List (Desktop sidebar) ────────────────────────
export function MemberList({ members, hostId, pendingRequests }: { members: any[]; hostId: string; pendingRequests?: any[] }) {
  const myUsername = useAuthStore(s => s.username);
  const isHost = myUsername === hostId;

  const handleApprove = (req: any) => {
    const socket = getSocket();
    (socket as any)?.emit('room:approve-join', { roomId: req.roomId, userId: req.userId });
    useRoomStore.getState().removePendingRequest(req.userId);
  };
  const handleReject = (req: any) => {
    const socket = getSocket();
    (socket as any)?.emit('room:reject-join', { roomId: req.roomId, userId: req.userId });
    useRoomStore.getState().removePendingRequest(req.userId);
  };

  return (
    <div className="members">
      {/* Pending join requests (host only) */}
      {isHost && pendingRequests && pendingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="members__title" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s ease-in-out infinite' }} />
            KATILMA İSTEKLERİ — {pendingRequests.length}
          </div>
          {pendingRequests.map(req => (
            <div key={req.userId} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {req.avatar ? (
                <img src={req.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'white',
                }}>{(req.username || '?')[0].toUpperCase()}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{req.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Onay bekliyor</div>
              </div>
              <button onClick={() => handleApprove(req)} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(34,197,94,0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Onayla">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => handleReject(req)} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Reddet">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="members__title">ÜYELER — {members.length}</div>
      {members.map(m => {
        const name = m.displayName ?? m.username ?? '?';
        const memberAvatar = m.avatar || null;
        return (
          <div key={m.userId} className="member" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
            {memberAvatar ? (
              <img src={memberAvatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 20px rgba(91,124,255,0.25)' }} />
            ) : (
              <div className="member__avatar">{name[0].toUpperCase()}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                {m.role === 'host' && <span className="badge badge--primary" style={{ fontSize: 10, padding: '1px 6px' }}>HOST</span>}
                {m.userId === hostId && <span title="Ekran kontrolü" style={{ display: 'inline-flex', marginLeft: 4, opacity: 0.7, color: 'var(--text-muted)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg></span>}
              </div>
            </div>
            <div className={`member__status member__status--${m.presence?.isConnected ? 'online' : 'offline'}`} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Leave Confirm Modal ──────────────────────────────────
export function LeaveConfirmModal({ roomName, onConfirm, onCancel }: { roomName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: 340, textAlign: 'center',
        animation: 'modalPopJuicy 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#ef4444' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Odadan Ayrıl</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          <strong>{roomName}</strong> odasından ayrılmak istediğine emin misin?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn--ghost" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }} onClick={onCancel}>Vazgeç</button>
          <button className="btn btn--primary" style={{ flex: 1, background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }} onClick={onConfirm}>Ayrıl</button>
        </div>
      </div>
    </div>
  );
}

// ─── Room Profile Modal ─────────────────────────────────
export function RoomProfileModal({ onClose }: { onClose: () => void }) {
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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ animation: 'modalPopJuicy 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
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

// ─── Theme Picker Popup — Liquid Glass & Bento Grid ────────
export function ThemePickerPopup({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const currentTheme = useRoomStore(s => s.theme);
  const [activeCategory, setActiveCategory] = useState<string>('colors');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (themeId: string) => {
    const socket = getSocket();
    if (socket) {
      (socket as any).emit('room:set-theme', { roomId, themeId });
    }
    onClose();
  };

  const categories = [
    { id: 'colors', name: 'Renkler', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg> },
    ...IMAGE_THEME_CATEGORIES,
  ];

  const currentImageThemes = IMAGE_THEMES.filter(t => t.category === activeCategory);

  // Get current theme's menuBg for modal styling
  const resolvedTheme = getTheme(currentTheme);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: resolvedTheme.isImage
          ? (resolvedTheme.isLight ? resolvedTheme.menuBg : resolvedTheme.menuBg)
          : (resolvedTheme.isLight ? 'rgba(245,243,255,0.92)' : 'rgba(30,27,75,0.85)'),
        backdropFilter: 'blur(24px) saturate(1.4)',
        borderRadius: 20,
        border: `1px solid ${resolvedTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(130,140,255,0.15)'}`,
        width: 'min(680px, 94vw)',
        maxHeight: '80vh',
        boxShadow: resolvedTheme.isLight
          ? '0 24px 80px rgba(0,0,0,0.15), 0 0 60px rgba(100,120,255,0.04), inset 0 1px 0 rgba(255,255,255,0.5)'
          : '0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(100,120,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden',
        color: resolvedTheme.isLight ? '#1e293b' : '#e2e8f0',
        animation: 'modalPopJuicy 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }}>
        {/* ── Category Bar (horizontal on mobile, vertical sidebar on desktop) ── */}
        {isMobile ? (
          /* Mobile: horizontal scroll bar at top */
          <div style={{
            borderBottom: `1px solid ${resolvedTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(130,140,255,0.1)'}`,
            padding: '12px 8px',
            display: 'flex', gap: 6,
            overflowX: 'auto', overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch' as any,
            flexShrink: 0,
            background: resolvedTheme.isLight ? 'rgba(0,0,0,0.03)' : 'rgba(15,12,50,0.3)',
            scrollbarWidth: 'none' as any,
          }}>
            <style>{`
              .theme-cat-bar::-webkit-scrollbar { display: none; }
            `}</style>
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? (resolvedTheme.isLight ? '#1e293b' : '#e2e8f0')
                      : (resolvedTheme.isLight ? 'rgba(71,85,105,0.7)' : 'rgba(180,190,240,0.6)'),
                    background: isActive
                      ? (resolvedTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(100,120,255,0.2)')
                      : 'transparent',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    minHeight: 36,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Desktop: vertical sidebar */
          <div style={{
            width: 160,
            borderRight: `1px solid ${resolvedTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(130,140,255,0.1)'}`,
            padding: '20px 0',
            display: 'flex', flexDirection: 'column',
            background: resolvedTheme.isLight ? 'rgba(0,0,0,0.03)' : 'rgba(15,12,50,0.3)',
            flexShrink: 0,
            overflowY: 'auto',
          }}>
            <div style={{
              padding: '0 16px 16px',
              fontSize: 11, fontWeight: 700, color: resolvedTheme.isLight ? 'rgba(100,116,139,0.7)' : 'rgba(180,190,240,0.5)',
              letterSpacing: 1.5, textTransform: 'uppercase' as const,
            }}>Temalar</div>
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', margin: '1px 8px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? (resolvedTheme.isLight ? '#1e293b' : '#e2e8f0')
                      : (resolvedTheme.isLight ? 'rgba(71,85,105,0.7)' : 'rgba(180,190,240,0.6)'),
                    background: isActive
                      ? (resolvedTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(100,120,255,0.15)')
                      : 'transparent',
                    transition: 'all 0.2s ease',
                    textAlign: 'left' as const,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = resolvedTheme.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(100,120,255,0.08)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}

            <div style={{ flex: 1 }} />
            <div style={{ padding: '12px 16px', fontSize: 10, color: resolvedTheme.isLight ? 'rgba(100,116,139,0.45)' : 'rgba(140,150,200,0.35)', lineHeight: 1.5 }}>
              Tema odadaki herkes için değişir
            </div>
          </div>
        )}

        {/* ── Right: Bento Grid ── */}
        <div style={{
          flex: 1, padding: 20, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>


          {/* Color themes grid */}
          {activeCategory === 'colors' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 10,
            }}>
              {THEMES.map(theme => {
                const isSelected = currentTheme === theme.id;
                const isHov = hoveredId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    onMouseEnter={() => setHoveredId(theme.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 14,
                      background: theme.bg,
                      border: isSelected
                        ? `2px solid ${theme.accent}`
                        : '2px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', position: 'relative',
                      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: isSelected
                        ? `0 0 16px ${theme.accent}40, 0 4px 12px rgba(0,0,0,0.3)`
                        : isHov ? '0 6px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                      transform: isHov ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 3,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60`,
                    }} />
                    <span style={{ fontSize: 8, color: theme.text, fontWeight: 600, opacity: 0.8 }}>
                      {theme.name}
                    </span>

                  </button>
                );
              })}
            </div>
          )}

          {/* Image themes Bento Grid */}
          {activeCategory !== 'colors' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 12,
            }}>
              {currentImageThemes.map(theme => {
                const isSelected = currentTheme === theme.id;
                const isHov = hoveredId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    onMouseEnter={() => setHoveredId(theme.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      position: 'relative',
                      aspectRatio: '4/3',
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: isSelected
                        ? `2px solid ${theme.accentColor}`
                        : '2px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      background: '#0a0a1a',
                      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                      boxShadow: isSelected
                        ? `0 0 20px ${theme.accentColor}40, 0 8px 24px rgba(0,0,0,0.4)`
                        : isHov ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
                      transform: isHov ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
                      padding: 0,
                    }}
                  >
                    {/* Thumbnail image */}
                    <img
                      src={theme.image}
                      alt={theme.name}
                      loading="lazy"
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                        transform: isHov ? 'scale(1.08)' : 'scale(1)',
                      }}
                    />

                    {/* Glass overlay with name */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '6px 8px',
                      background: theme.isLight
                        ? 'rgba(255,255,255,0.7)'
                        : 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      borderTop: `1px solid ${theme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: theme.textColor,
                        letterSpacing: 0.3,
                      }}>{theme.name}</span>
                    </div>

                    {/* Light/Dark indicator */}
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: theme.isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      border: `1px solid ${theme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9,
                    }}>
                      {theme.isLight 
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      }
                    </div>


                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Aggregated Modal Container ───────────────────────────
// Renders all modals conditionally with mode-aware pointer-events
interface RoomModalsProps {
  mode: RoomMode;
  // Member popup
  showMembers: boolean;
  members: any[];
  pendingJoinRequests: any[];
  hostId: string;
  onCloseMembers: () => void;
  // Theme picker
  showThemes: boolean;
  roomId: string;
  onCloseThemes: () => void;
  // Leave confirm
  showLeaveConfirm: boolean;
  roomName: string;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
  // Profile modal
  showProfileModal: boolean;
  onCloseProfile: () => void;
}

export function RoomModals({
  mode,
  showMembers, members, pendingJoinRequests, hostId, onCloseMembers,
  showThemes, roomId, onCloseThemes,
  showLeaveConfirm, roomName, onConfirmLeave, onCancelLeave,
  showProfileModal, onCloseProfile,
}: RoomModalsProps) {
  // In landscape mode, modals need pointer-events: auto to be clickable
  // through the pointer-events: none parent
  const wrap = mode === 'mobile-landscape' ? { pointerEvents: 'auto' as const } : {};

  return (
    <>
      {showMembers && mode !== 'desktop' && (
        <div style={wrap}>
          <MemberPopup members={members} onClose={onCloseMembers} pendingRequests={pendingJoinRequests} hostId={hostId} />
        </div>
      )}
      {showThemes && (
        <div style={wrap}>
          <ThemePickerPopup roomId={roomId} onClose={onCloseThemes} />
        </div>
      )}
      {showLeaveConfirm && (
        <div style={wrap}>
          <LeaveConfirmModal roomName={roomName} onConfirm={onConfirmLeave} onCancel={onCancelLeave} />
        </div>
      )}
      {showProfileModal && (
        <div style={wrap}>
          <RoomProfileModal onClose={onCloseProfile} />
        </div>
      )}
    </>
  );
}
