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
  const isMe = msg.userId === username;
  
  const bubbleRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const swiping = useRef<boolean>(false);
  const locked = useRef<boolean>(false);

  const handleStart = (clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    currentX.current = clientX;
    swiping.current = false;
    locked.current = false;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!bubbleRef.current || !iconRef.current) return;
    const diffX = clientX - startX.current;
    const diffY = clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        locked.current = true;
        if (Math.abs(diffY) > Math.abs(diffX)) {
          swiping.current = false;
          return;
        }
        swiping.current = true;
        bubbleRef.current.style.transition = 'none';
        iconRef.current.style.transition = 'none';
      }
      return;
    }

    if (!swiping.current) return;
    currentX.current = clientX;

    let rawDiff = isMe ? (startX.current - currentX.current) : (currentX.current - startX.current);
    let diff = Math.max(0, rawDiff);
    
    // Rubber-band effect after threshold
    const threshold = 64;
    const maxSwipe = 100;
    if (diff > threshold) {
      diff = threshold + (diff - threshold) * 0.3;
    }
    diff = Math.min(diff, maxSwipe);

    // Only move the bubble
    const translateX = isMe ? -diff : diff;
    bubbleRef.current.style.transform = `translateX(${translateX}px)`;

    // Icon appears and follows bubble slightly
    const progress = Math.min(diff / threshold, 1);
    const followOffset = diff * 0.15;
    const iconTranslateX = isMe ? -followOffset : followOffset;
    const scaleVal = progress >= 1 ? 1.0 : (0.3 + progress * 0.7);
    
    iconRef.current.style.opacity = progress.toString();
    iconRef.current.style.transform = `translate(${iconTranslateX}px, -50%) scale(${scaleVal})`;
  };

  const handleEnd = () => {
    if (!swiping.current || !bubbleRef.current || !iconRef.current) return;
    const threshold = 64;
    let rawDiff = isMe ? (startX.current - currentX.current) : (currentX.current - startX.current);
    const triggered = rawDiff > threshold;

    bubbleRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bubbleRef.current.style.transform = 'translateX(0)';

    iconRef.current.style.transition = 'opacity 0.25s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    if (triggered) {
      iconRef.current.style.transform = 'translate(0px, -50%) scale(1.3)';
      iconRef.current.style.opacity = '0';
      onReply(msg);
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      iconRef.current.style.transform = 'translate(0px, -50%) scale(0)';
      iconRef.current.style.opacity = '0';
    }

    swiping.current = false;
    locked.current = false;
  };
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
      id={`msg-${msg.id}`}
      className="chat-message-row"
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => { if (e.buttons === 1) handleMove(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      style={{
        position: 'relative',
        touchAction: 'pan-y',
        display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 8, marginTop: marginT, padding: '0 4px',
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
        <div style={{ position: 'relative' }}>
          {/* SecretChat Reply Icon */}
          <div 
            ref={iconRef}
            style={{
              position: 'absolute',
              top: '50%',
              transform: `translate(0px, -50%) scale(0)`,
              [isMe ? 'right' : 'left']: 0,
              opacity: 0,
              width: 28, height: 28,
              borderRadius: '50%',
              background: activeTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeTheme.isLight ? '#555' : '#ccc',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
            </svg>
          </div>

          <div 
            ref={bubbleRef}
            className="chat-bubble-container"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: isMe ? 'flex-end' : 'flex-start',
              position: 'relative', 
              zIndex: 2,
              cursor: isMobile ? 'default' : 'pointer'
            }}
          >
            {/* Desktop Reply Button on Hover */}
            {!isMobile && (
              <div 
                className="desktop-reply-btn"
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isMe ? 'left' : 'right']: -32,
                  opacity: 0,
                  cursor: 'pointer',
                  width: 24, height: 24,
                  borderRadius: '50%',
                  background: activeTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: activeTheme.isLight ? '#555' : '#ccc',
                  transition: 'opacity 0.2s',
                  zIndex: 3
                }}
                onClick={() => onReply(msg)}
                title="Yanıtla"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                </svg>
              </div>
            )}

            {msg.replyTo && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'stretch',
                  marginBottom: 4,
                  opacity: 0.95,
                  maxWidth: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const el = document.getElementById(`msg-${msg.replyTo.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.remove('highlight-glow');
                    void el.offsetWidth; // trigger reflow
                    el.classList.add('highlight-glow');
                    setTimeout(() => {
                      el.classList.remove('highlight-glow');
                    }, 700);
                  }
                }}
              >
                {/* Vertical Line */}
                <div style={{
                  width: 3,
                  borderRadius: 2,
                  background: activeTheme.isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)',
                  marginRight: isMe ? 0 : 6,
                  marginLeft: isMe ? 6 : 0,
                  flexShrink: 0
                }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', justifyContent: 'center', minWidth: 0 }}>
                  {/* Label */}
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 600,
                    marginBottom: 4,
                    color: activeTheme.isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
                  }}>
                    {isMe ? 'Yanıt verdin' : (msg.replyTo.userId === username ? 'sana yanıt verdi' : `${msg.replyTo.username} adlı kişiye yanıt verdi`)}
                  </span>
                  
                  {/* Reply Preview Capsule */}
                  <div style={{
                    background: isMe ? 'rgba(255,255,255,0.15)' : (activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'),
                    color: activeTheme.textColor,
                    padding: '6px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    maxWidth: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    border: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    {msg.replyTo.text}
                  </div>
                </div>
              </div>
            )}

            {/* Actual Message Bubble */}
            <div style={{
              background: bubbleBg, color: textColor,
              padding: isKeyboardOpen ? '6px 10px' : '8px 12px',
              borderRadius: borderRadius, fontSize: isKeyboardOpen ? 12 : 13,
              lineHeight: 1.4, wordBreak: 'break-word',
              boxShadow: activeTheme.isImage && !isMe ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              border: isMe ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'padding 0.2s ease, font-size 0.2s ease',
            }}>
              {msg.text}
            </div>
          </div>
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
          padding: '10px 14px',
          background: activeTheme.menuBg,
          backdropFilter: activeTheme.isImage ? 'blur(16px) saturate(1.2)' : 'none',
          borderTop: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : (activeTheme.isImage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)')}`,
          position: 'relative',
          zIndex: 1,
          color: activeTheme.textColor, flexShrink: 0,
          animation: 'slideUpSmooth 0.25s ease-out forwards',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, borderLeft: `3px solid ${activeTheme.accent}`, paddingLeft: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: activeTheme.textColor, marginBottom: 2 }}>
              {replyToMsg.displayName ?? replyToMsg.username} adlı kişiye yanıt veriyorsun
            </span>
            <span style={{ fontSize: 12, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Input Area (Instagram Style) */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: isKeyboardOpen ? '4px 8px' : '8px 12px',
        paddingBottom: isKeyboardOpen ? '4px' : 'max(8px, env(safe-area-inset-bottom, 8px))',
        borderTop: replyToMsg ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : (activeTheme.isImage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)')}`,
        background: activeTheme.menuBg, flexShrink: 0,
        backdropFilter: activeTheme.isImage ? 'blur(16px) saturate(1.2)' : 'none',
        transition: 'padding 0.28s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
          borderRadius: 9999,
          padding: '4px',
          gap: 8,
          transition: 'all 0.2s ease',
        }}>
          {/* Left Empty Circle */}
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: activeTheme.accent,
            flexShrink: 0,
          }} />

          {/* Input Field */}
          <input
            ref={inputRef}
            value={text}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            onFocus={(e) => {
              e.target.scrollIntoView = () => {};
              setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 350);
            }}
            placeholder="Mesaj..."
            maxLength={500}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            style={{
              flex: 1, height: 34, padding: '0 2px',
              background: 'transparent',
              border: 'none',
              color: activeTheme.isLight ? '#1e293b' : '#e2e8f0',
              fontSize: 15,
              fontFamily: 'inherit', outline: 'none', minWidth: 0,
              WebkitAppearance: 'none' as any,
              touchAction: 'manipulation',
            }}
          />

          {/* Right Icons or Send Button */}
          {text.trim() ? (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onTouchEnd={(e) => { e.preventDefault(); handleSend(); }}
              onClick={handleSend}
              style={{
                background: activeTheme.accent,
                borderRadius: 9999,
                width: 52, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.25s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                <line x1="22" y1="2" x2="11" y2="13" />
              </svg>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 8, color: activeTheme.isLight ? '#475569' : '#cbd5e1' }}>
              {/* Mic */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              {/* Gallery */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" ry="4"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              {/* Sticker */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15.5V8a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h7.5l5.5-5.5z"/>
                <path d="M21 15.5H15.5V21"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="10" x2="9.01" y2="10"/>
                <line x1="15" y1="10" x2="15.01" y2="10"/>
              </svg>
              {/* Plus */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
          )}
        </div>
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
