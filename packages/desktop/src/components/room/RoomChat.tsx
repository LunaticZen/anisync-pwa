// ═══════════════════════════════════════════════════════════════
// Room — Chat Components
// ChatPanel (portrait/desktop) + ChatTicker (landscape)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore, useChatStore, useRoomStore } from '../../stores';
import { getSocket } from '../../services/socket';
import { isMobile, avatarColor, getTheme, type RoomMode } from './constants';

// ─── Ticker Item Type ─────────────────────────────────────
export interface TickerItem {
  id: string;
  username: string;
  text: string;
  key: number;
  lane: number;
}

export const DANMAKU_LANE_COUNT = 3;
const DANMAKU_LANE_HEIGHT = 36;
const DANMAKU_CONTAINER_HEIGHT = 120;

// ─── Chat Ticker (Landscape overlay) ──────────────────────
function ChatTicker({ tickerItems, onRemoveTickerItem }: {
  tickerItems: TickerItem[];
  onRemoveTickerItem: (key: number) => void;
}) {
  const chatMessages = useChatStore(s => s.messages);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: DANMAKU_CONTAINER_HEIGHT, zIndex: 10, overflow: 'hidden',
      background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes danmakuSlide {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(calc(-100% - 20px)); }
        }
      `}</style>
      {tickerItems.map(item => (
        <span
          key={item.key}
          onAnimationEnd={() => onRemoveTickerItem(item.key)}
          style={{
            position: 'absolute',
            bottom: 8 + item.lane * DANMAKU_LANE_HEIGHT,
            left: 0,
            whiteSpace: 'nowrap',
            animation: `danmakuSlide ${Math.max(8, item.text.length * 0.12 + 6)}s linear forwards`,
            fontSize: 14, fontWeight: 500,
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
            paddingLeft: 12,
          }}
        >
          <span style={{ color: '#5b9bff', fontWeight: 700 }}>{item.username}: </span>
          {item.text}
        </span>
      ))}
      {tickerItems.length === 0 && chatMessages.filter(m => m.type !== 'system').length === 0 && (
        <span style={{
          position: 'absolute', bottom: 12, right: 16,
          color: 'rgba(255,255,255,0.3)', fontSize: 12,
        }}>Henüz mesaj yok</span>
      )}
    </div>
  );
}

// ─── Swipable Message Component ─────────────────────────────
function SwipableMessage({ msg, i, username, members, messages, activeTypers, isKeyboardOpen, activeTheme, onReply }: any) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef<number | null>(null);

  const handleStart = (clientX: number) => { startX.current = clientX; };
  const handleMove = (clientX: number) => {
    if (startX.current === null) return;
    const diff = clientX - startX.current;
    if (diff > 0 && diff < 80) setSwipeX(diff);
  };
  const handleEnd = () => {
    if (swipeX > 40) {
      onReply(msg);
      if (navigator.vibrate) navigator.vibrate(50);
    }
    setSwipeX(0);
    startX.current = null;
  };

  const isMe = msg.userId === username;
  const prevMsg = i > 0 ? messages[i - 1] : null;
  const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;
  const isConsecutivePrev = prevMsg && prevMsg.type !== 'system' && prevMsg.userId === msg.userId;
  const isConsecutiveNext = (nextMsg && nextMsg.type !== 'system' && nextMsg.userId === msg.userId) ||
    (i === messages.length - 1 && activeTypers.some((t: any) => t.userId === msg.userId));
  const displayName = msg.displayName ?? msg.username;
  const msgAvatar = members.find((x: any) => x.userId === msg.userId)?.avatar || null;
  const clr = avatarColor(msg.username);

  const topRadius = 18; const bottomRadius = 18; const smallRadius = 4;
  const borderRadius = isMe
    ? `${topRadius}px ${isConsecutivePrev ? smallRadius : topRadius}px ${isConsecutiveNext ? smallRadius : bottomRadius}px ${bottomRadius}px`
    : `${isConsecutivePrev ? smallRadius : topRadius}px ${topRadius}px ${bottomRadius}px ${isConsecutiveNext ? smallRadius : bottomRadius}px`;

  const bubbleBg = isMe ? activeTheme.accent : (activeTheme.isLight ? '#f1f5f9' : (activeTheme.isImage ? 'rgba(0,0,0,0.5)' : '#334155'));
  const textColor = isMe ? 'white' : (activeTheme.isLight ? '#0f172a' : '#f8fafc');
  const marginT = isConsecutivePrev ? 2 : (isKeyboardOpen ? 6 : 12);
  const avaSize = isKeyboardOpen ? 20 : 28;

  return (
    <div
      onTouchStart={e => handleStart(e.touches[0].clientX)}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={e => handleStart(e.clientX)}
      onMouseMove={e => { if (e.buttons === 1) handleMove(e.clientX); }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      style={{
        display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 8, marginTop: marginT, padding: '0 4px',
        transition: swipeX === 0 ? 'transform 0.2s ease, margin 0.2s ease' : 'margin 0.2s ease',
        transform: `translateX(${swipeX}px)`,
        animation: isMe ? 'none' : 'messageSlideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        transformOrigin: isMe ? 'bottom right' : 'bottom left',
      }}
    >
      {!isMe && (
        <div style={{ width: avaSize, height: avaSize, flexShrink: 0, opacity: isConsecutiveNext ? 0 : 1, transition: 'all 0.2s ease' }}>
          {msgAvatar ? (
            <img src={msgAvatar} alt="" style={{ width: avaSize, height: avaSize, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: avaSize, height: avaSize, borderRadius: '50%',
              background: clr, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: avaSize * 0.4, fontWeight: 700, color: 'white'
            }}>{(displayName || '?')[0].toUpperCase()}</div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
        {!isMe && !isConsecutivePrev && (
          <span style={{ fontSize: 11, fontWeight: 600, color: clr, marginLeft: 4, marginBottom: 4 }}>{displayName}</span>
        )}
        <div style={{
          background: bubbleBg, color: textColor,
          padding: isKeyboardOpen ? '6px 10px' : '8px 12px',
          borderRadius: borderRadius, fontSize: isKeyboardOpen ? 12 : 13,
          lineHeight: 1.4, wordBreak: 'break-word',
          boxShadow: activeTheme.isImage && !isMe ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          border: isMe ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
          transition: 'padding 0.2s ease, font-size 0.2s ease',
        }}>
          {msg.replyTo && (
            <div style={{
              background: isMe ? 'rgba(0,0,0,0.15)' : (activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'),
              borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.6)' : activeTheme.accent}`,
              padding: '4px 8px', borderRadius: 4, marginBottom: 6, fontSize: 11, opacity: 0.9
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{msg.replyTo.username}</div>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {msg.replyTo.text}
              </div>
            </div>
          )}
          {msg.text}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel (Portrait / Desktop) ──────────────────────
// Wrapped in React.memo for render optimization
const ChatPanel = React.memo(function ChatPanel({ roomId, members, isKeyboardOpen }: {
  roomId: string;
  members: any[];
  isKeyboardOpen?: boolean;
}) {
  const { messages, typingUsers } = useChatStore();
  const { username } = useAuthStore();
  const [text, setText] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout>>();
  const roomTheme = useRoomStore(s => s.theme);
  const activeTheme = getTheme(roomTheme);

  // Auto-scroll to bottom when new messages arrive or typing indicator appears
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, typingUsers]);

  // When keyboard opens, ensure messages are scrolled to bottom
  useEffect(() => {
    if (!messagesRef.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isKeyboardOpen) {
      // Keyboard opened — scroll immediately
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    } else {
      // Keyboard closed — wait for Android dismiss animation (~200ms)
      timer = setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isKeyboardOpen]);

  useEffect(() => {
    if (!isMobile) return;
    const input = inputRef.current;
    if (!input) return;
    const handleFocus = () => {
      // Wait for keyboard animation to finish, then scroll input into view
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Also scroll chat to bottom
        endRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 350);
    };
    input.addEventListener('focus', handleFocus);
    return () => input.removeEventListener('focus', handleFocus);
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    getSocket()?.emit('chat:message', { 
      roomId, 
      text: text.trim(),
      replyTo: replyToMsg ? { id: replyToMsg.id, username: replyToMsg.displayName ?? replyToMsg.username, text: replyToMsg.text } : undefined
    });
    setText('');
    setReplyToMsg(null);
    getSocket()?.emit('chat:typing', { roomId, isTyping: false });
    // Keep keyboard open — refocus input after send
    if (isMobile) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
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

  // Find member avatar by userId
  const getMemberAvatar = (userId: string) => {
    const m = members.find(x => x.userId === userId);
    return m?.avatar || null;
  };

  return (
    <div className="chat" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Chat Header — slides up and vanishes when keyboard opens */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isKeyboardOpen ? '0 14px' : '8px 14px',
        borderBottom: isKeyboardOpen ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
        flexShrink: 0,
        maxHeight: isKeyboardOpen ? 0 : 40,
        opacity: isKeyboardOpen ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isKeyboardOpen ? 'none' as const : 'auto' as const,
        color: activeTheme.textColor,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Sohbet</span>
        </div>
        <span style={{ fontSize: 11, color: activeTheme.isLight ? '#64748b' : '#64748b' }}>{messages.length} mesaj</span>
      </div>

      {/* Messages — compact when keyboard open */}
      <div ref={messagesRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: isKeyboardOpen ? '4px 6px' : '8px 10px',
        display: 'flex', flexDirection: 'column',
        gap: isKeyboardOpen ? 1 : 4,
        WebkitOverflowScrolling: 'touch' as any,
        transition: 'padding 0.2s ease, gap 0.2s ease',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: activeTheme.isLight ? '#94a3b8' : '#475569', fontSize: 13 }}>Henüz mesaj yok</div>
        )}
        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} style={{ textAlign: 'center', color: activeTheme.isLight ? '#64748b' : '#475569', fontSize: 11, padding: isKeyboardOpen ? '2px 0' : '6px 0' }}>
                {msg.text}
              </div>
            );
          }

          return <SwipableMessage key={msg.id} msg={msg} i={i} username={username} members={members} messages={messages} activeTypers={activeTypers} isKeyboardOpen={isKeyboardOpen} activeTheme={activeTheme} onReply={setReplyToMsg} />;
        })}

        {/* Typing indicator */}
        {activeTypers.length > 0 && activeTypers.map((t) => {
          const bubbleBg = activeTheme.isLight ? '#f1f5f9' : (activeTheme.isImage ? 'rgba(0,0,0,0.5)' : '#334155');
          const dotColor = activeTheme.isLight ? '#8E8E93' : 'rgba(255,255,255,0.5)';
          const avaSize = isKeyboardOpen ? 20 : 28;
          
          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
          const isConsecutivePrev = lastMsg && lastMsg.type !== 'system' && lastMsg.userId === t.userId;
          
          const marginT = isConsecutivePrev ? 2 : (isKeyboardOpen ? 6 : 12);
          const typingRadius = isConsecutivePrev ? '4px 18px 18px 18px' : '18px 18px 18px 18px';

          // Find typing user's details
          const m = members.find(x => x.userId === t.userId);
          const msgAvatar = m?.avatar || null;
          const displayName = m?.displayName ?? t.username ?? t.userId;
          const clr = avatarColor(t.username ?? t.userId);

          return (
            <div key={`typing-${t.userId}`} style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 8,
              padding: '0 4px',
              marginTop: marginT,
              animation: 'messageSlideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              transformOrigin: 'bottom left',
            }}>
              {/* Avatar for the typing user */}
              <div style={{ width: avaSize, height: avaSize, flexShrink: 0, transition: 'all 0.2s ease' }}>
                {msgAvatar ? (
                  <img src={msgAvatar} alt="" style={{ width: avaSize, height: avaSize, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: avaSize, height: avaSize, borderRadius: '50%',
                    background: clr, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: avaSize * 0.4, fontWeight: 700, color: 'white'
                  }}>{(displayName || '?')[0].toUpperCase()}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="typing-bubble" style={{
                  background: bubbleBg,
                  padding: isKeyboardOpen ? '8px 14px' : '10px 16px',
                  minHeight: isKeyboardOpen ? 28 : 34,
                  borderRadius: typingRadius,
                  boxShadow: activeTheme.isImage ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  border: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                  <div className="typing-dot" style={{ background: dotColor }} />
                  <div className="typing-dot" style={{ background: dotColor }} />
                  <div className="typing-dot" style={{ background: dotColor }} />
                </div>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>



      {/* Reply Preview Banner */}
      {replyToMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          background: activeTheme.isLight ? '#f8fafc' : (activeTheme.isImage ? 'rgba(0,0,0,0.4)' : '#1e293b'),
          borderTop: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
          borderLeft: `4px solid ${activeTheme.accent}`,
          color: activeTheme.textColor, flexShrink: 0,
          backdropFilter: activeTheme.isImage ? 'blur(16px)' : 'none',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: activeTheme.accent, marginBottom: 2 }}>
              Yanıtlanıyor: {replyToMsg.displayName ?? replyToMsg.username}
            </span>
            <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyToMsg.text}
            </span>
          </div>
          <button
            onClick={() => setReplyToMsg(null)}
            style={{ background: 'none', border: 'none', color: activeTheme.textColor, opacity: 0.6, cursor: 'pointer', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}

      {/* Input Area — ultra-compact when keyboard open */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isKeyboardOpen ? 6 : 8,
        padding: isKeyboardOpen ? '3px 6px' : '8px 10px',
        paddingBottom: isKeyboardOpen ? '3px' : 'max(8px, env(safe-area-inset-bottom, 8px))',
        borderTop: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : (activeTheme.isImage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)')}`,
        background: activeTheme.menuBg, flexShrink: 0,
        backdropFilter: activeTheme.isImage ? 'blur(16px) saturate(1.2)' : 'none',
        transition: 'padding 0.28s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease',
      }}>
        <input
          ref={inputRef}
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          onFocus={(e) => {
            // Prevent MIUI WebView from auto-scrolling the page on input focus
            e.target.scrollIntoView = () => {};
            // Delay scroll-to-bottom to after keyboard settles
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 350);
          }}
          placeholder="Mesaj yaz..."
          maxLength={500}
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          style={{
            flex: 1, height: 38, padding: isKeyboardOpen ? '0 10px' : '0 14px',
            background: activeTheme.isLight
              ? (activeTheme.isImage ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)')
              : (activeTheme.isImage ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)'),
            border: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: isKeyboardOpen ? 16 : 20,
            color: activeTheme.isLight ? '#1e293b' : '#e2e8f0',
            fontSize: isKeyboardOpen ? 14 : 16,
            fontFamily: 'inherit', outline: 'none', minWidth: 0,
            WebkitAppearance: 'none' as any,
            touchAction: 'manipulation',
            transition: 'height 0.2s ease, padding 0.2s ease, font-size 0.2s ease, border-radius 0.2s ease',
          }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onTouchEnd={(e) => { e.preventDefault(); handleSend(); }}
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            background: text.trim()
              ? activeTheme.accent
              : `${activeTheme.accent}22`,
            border: text.trim() ? 'none' : `1px solid ${activeTheme.accent}33`,
            borderRadius: isKeyboardOpen ? 16 : 20,
            color: text.trim()
              ? 'white'
              : activeTheme.accent,
            padding: isKeyboardOpen ? '5px 12px' : '8px 16px',
            fontSize: isKeyboardOpen ? 12 : 13, fontWeight: 700,
            cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: isKeyboardOpen ? 4 : 6,
            flexShrink: 0, transition: 'all 0.25s ease',
            whiteSpace: 'nowrap',
            boxShadow: text.trim() ? `0 2px 12px ${activeTheme.accent}50` : 'none',
            opacity: text.trim() ? 1 : 0.7,
          }}
        >
          Gönder
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
});

// ─── Room Chat (Mode-aware wrapper) ───────────────────────
interface RoomChatProps {
  mode: RoomMode;
  roomId: string;
  members: any[];
  isKeyboardOpen?: boolean;
  // Landscape ticker
  tickerItems?: TickerItem[];
  onRemoveTickerItem?: (key: number) => void;
}

export function RoomChat({ mode, roomId, members, isKeyboardOpen, tickerItems, onRemoveTickerItem }: RoomChatProps) {
  if (mode === 'mobile-landscape') {
    return (
      <ChatTicker
        tickerItems={tickerItems || []}
        onRemoveTickerItem={onRemoveTickerItem || (() => {})}
      />
    );
  }

  // Desktop & mobile-portrait: full chat panel
  return (
    <ChatPanel
      roomId={roomId}
      members={members}
      isKeyboardOpen={isKeyboardOpen}
    />
  );
}
