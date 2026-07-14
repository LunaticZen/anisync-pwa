// ═══════════════════════════════════════════════════════════════
// Room — Chat Components
// ChatPanel (portrait/desktop) + ChatTicker (landscape)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore, useChatStore, useRoomStore, useUIStore } from '../../stores';
import { getSocket } from '../../services/socket';
import { isMobile, avatarColor, getTheme, type RoomMode } from './constants';
import { EmojiPicker } from './EmojiPicker';
import { StickerPicker } from './StickerPicker';
import { MessageOverlayMenu, useOverlayMenu, type OverlayMenuAction } from './MessageOverlayMenu';

function renderMessageText(text: string, isOnlyEmojiOrSticker: boolean) {
  const tokenRegex = /\[(emoji|sticker):([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const type = match[1];
    const path = match[2];
    
    if (type === 'emoji') {
      parts.push(
        <img 
          key={match.index} 
          src={path.startsWith('http') ? path : `https://cdn.jsdelivr.net/gh/LunaticZen/live_wallpapers@main/emojis/${path}`} 
          alt="emoji" 
          style={{ 
            height: isOnlyEmojiOrSticker ? 48 : 24, 
            verticalAlign: 'middle', 
            display: 'inline-block',
            margin: '0 2px'
          }} 
        />
      );
    } else if (type === 'sticker') {
      parts.push(
        <img 
          key={match.index} 
          src={path} 
          alt="sticker" 
          style={{ 
            height: isOnlyEmojiOrSticker ? 100 : 32, 
            verticalAlign: 'middle', 
            display: 'inline-block',
            margin: '0 4px',
            borderRadius: 8
          }} 
        />
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}

function renderReplyText(text: string) {
  if (text.includes('[sticker:')) {
    return <span style={{ fontStyle: 'italic', opacity: 0.8 }}>Çıkartmayı görmek için tıkla</span>;
  }
  return renderMessageText(text, false);
}

function renderInputReplyText(text: string) {
  if (text.includes('[sticker:')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
        <span>Dosya eki</span>
      </span>
    );
  }
  return renderMessageText(text, false);
}

// ─── Ticker Item Type ─────────────────────────────────────
export interface TickerItem {
  id: string;
  username: string;
  text: string;
  key: number;
  lane: number;
  createdAt: number;  // Date.now() when the item was created
  duration: number;   // animation duration in seconds
}

export const DANMAKU_LANE_COUNT = 3;
const DANMAKU_LANE_HEIGHT = 36;
const DANMAKU_CONTAINER_HEIGHT = 120;

/** Calculate danmaku duration based on text length */
export function getDanmakuDuration(text: string): number {
  return 10;
}

// ─── Chat Ticker (Landscape overlay) ──────────────────────
// Time-based: uses negative animation-delay to resume from
// the correct position when re-mounted after unmount.
function ChatTicker({ tickerItems }: {
  tickerItems: TickerItem[];
}) {
  const chatMessages = useChatStore(s => s.messages);
  const now = Date.now();

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
      {tickerItems.map(item => {
        // How many seconds have elapsed since this item was created
        const elapsedSec = (now - item.createdAt) / 1000;
        // If elapsed exceeds duration, don't render (will be cleaned up by timer)
        if (elapsedSec >= item.duration) return null;

        return (
          <span
            key={item.key}
            style={{
              position: 'absolute',
              bottom: 8 + item.lane * DANMAKU_LANE_HEIGHT,
              left: 0,
              whiteSpace: 'nowrap',
              animation: `danmakuSlide ${item.duration}s linear forwards`,
              // Negative delay = jump to the correct position in the animation
              animationDelay: `-${elapsedSec.toFixed(2)}s`,
              fontSize: 14, fontWeight: 500,
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
              paddingLeft: 12,
            }}
          >
            <span style={{ color: '#5b9bff', fontWeight: 700 }}>{item.username}: </span>
            {renderMessageText(item.text, false)}
          </span>
        );
      })}
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
function SwipableMessage({ msg, i, username, members, messages, activeTypers, isKeyboardOpen, activeTheme, effectiveIsLight, onReply, onOpenOverlay }: any) {
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

  const isOnlyEmojiOrSticker = /^(\s*\[(emoji|sticker):[^\]]+\]\s*)+$/.test(msg.text);
  const bubbleBg = isOnlyEmojiOrSticker ? 'transparent' : (isMe ? activeTheme.accent : (effectiveIsLight ? '#f1f5f9' : (activeTheme.isImage ? 'rgba(0,0,0,0.5)' : '#334155')));
  const textColor = isMe ? 'white' : (effectiveIsLight ? '#0f172a' : '#f8fafc');
  const marginT = isConsecutivePrev ? 2 : (isKeyboardOpen ? 6 : 12);
  const avaSize = isKeyboardOpen ? 20 : 28;

  // ── Long-press timer for mobile overlay menu ──
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const bubbleCloneRef = useRef<HTMLDivElement>(null);

  const handleLongPressStart = useCallback((_e: React.TouchEvent | React.MouseEvent) => {
    longPressTimer.current = setTimeout(() => {
      if (bubbleCloneRef.current) {
        onOpenOverlay(msg, bubbleCloneRef.current);
      }
    }, 500);
  }, [msg, onOpenOverlay]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bubbleCloneRef.current) {
      onOpenOverlay(msg, bubbleCloneRef.current);
    }
  }, [msg, onOpenOverlay]);

  // Cancel long-press on scroll/move
  const wrappedHandleStart = (clientX: number, clientY: number) => {
    handleStart(clientX, clientY);
  };

  const wrappedHandleMove = (clientX: number, clientY: number) => {
    // Cancel long-press if finger moves
    if (longPressTimer.current) {
      const dx = Math.abs(clientX - startX.current);
      const dy = Math.abs(clientY - startY.current);
      if (dx > 8 || dy > 8) {
        handleLongPressEnd();
      }
    }
    handleMove(clientX, clientY);
  };

  return (
    <div
      id={`msg-${msg.id}`}
      className="chat-message-row"
      onTouchStart={e => { handleLongPressStart(e); wrappedHandleStart(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchMove={e => wrappedHandleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={() => { handleLongPressEnd(); handleEnd(); }}
      onTouchCancel={() => { handleLongPressEnd(); handleEnd(); }}
      onMouseDown={e => { if (e.button === 0) wrappedHandleStart(e.clientX, e.clientY); }}
      onMouseMove={e => { if (e.buttons === 1) wrappedHandleMove(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={() => { handleLongPressEnd(); handleEnd(); }}
      onContextMenu={handleContextMenu}
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%', minWidth: 0 }}>
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
              background: effectiveIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: effectiveIsLight ? '#555' : '#ccc',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
            </svg>
          </div>

          <div 
            ref={(el) => { (bubbleRef as any).current = el; (bubbleCloneRef as any).current = el; }}
            className="chat-bubble-container"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: isMe ? 'flex-end' : 'flex-start',
              position: 'relative', 
              maxWidth: '100%',
              minWidth: 0,
              zIndex: 2,
              cursor: isMobile ? 'default' : 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            } as any}
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
                  background: effectiveIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: effectiveIsLight ? '#555' : '#ccc',
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
                  minWidth: 0,
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
                  background: effectiveIsLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)',
                  marginRight: isMe ? 0 : 6,
                  marginLeft: isMe ? 6 : 0,
                  flexShrink: 0
                }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', justifyContent: 'center', minWidth: 0, maxWidth: 'calc(100% - 9px)' }}>
                  {/* Label */}
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 600,
                    marginBottom: 4,
                    color: effectiveIsLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {isMe ? 'Yanıt verdin' : (msg.replyTo.userId === username ? 'sana yanıt verdi' : `${msg.replyTo.username} adlı kişiye yanıt verdi`)}
                  </span>
                  
                  {/* Reply Preview Capsule */}
                  <div style={{
                    background: effectiveIsLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                    color: effectiveIsLight ? '#0f172a' : '#f8fafc',
                    padding: '6px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    maxWidth: '100%',
                    wordBreak: 'break-all', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
                    border: `1px solid ${effectiveIsLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    {renderReplyText(msg.replyTo.text)}
                  </div>
                </div>
              </div>
            )}

            {/* Actual Message Bubble */}
            <div style={{
              background: bubbleBg, color: textColor,
              maxWidth: '100%', minWidth: 0,
              padding: isOnlyEmojiOrSticker ? 0 : (isKeyboardOpen ? '6px 10px' : '8px 12px'),
              borderRadius: borderRadius, fontSize: isKeyboardOpen ? 12 : 13,
              lineHeight: 1.4, wordBreak: 'break-word',
              boxShadow: isOnlyEmojiOrSticker ? 'none' : (activeTheme.isImage && !isMe ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'),
              border: isOnlyEmojiOrSticker ? 'none' : (isMe ? 'none' : `1px solid ${effectiveIsLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`),
              /* padding/font-size removed from transition to prevent layout thrashing */
            }}>
              {renderMessageText(msg.text, isOnlyEmojiOrSticker)}
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isHeartClicked, setIsHeartClicked] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const uiTheme = useUIStore(s => s.theme);
  const roomTheme = useRoomStore(s => s.theme);
  const activeTheme = getTheme(roomTheme);

  // ── Overlay Menu State ──
  const { overlayState, openMenu, closeMenu } = useOverlayMenu();
  const [overlayMsg, setOverlayMsg] = useState<any>(null);

  const handleOpenOverlay = useCallback((msg: any, bubbleEl: HTMLElement) => {
    setOverlayMsg(msg);
    openMenu(msg.id, bubbleEl);
  }, [openMenu]);

  const overlayActions: OverlayMenuAction[] = React.useMemo(() => {
    if (!overlayMsg) return [];
    
    const stickerUrlMatch = overlayMsg.text.match(/\[sticker:([^\]]+)\]/);
    const stickerUrl = stickerUrlMatch ? stickerUrlMatch[1] : null;
    
    const favoritesStr = localStorage.getItem('anisync_favorite_stickers');
    const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];
    const isFavorited = stickerUrl ? favorites.includes(stickerUrl) : false;

    const acts: OverlayMenuAction[] = [
      {
        label: 'Kopyala',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        ),
        onClick: () => {
          const plainText = overlayMsg.text.replace(/\[emoji:[^\]]+\]/g, '😊');
          navigator.clipboard?.writeText(plainText).catch(() => {});
        },
      },
    ];

    if (stickerUrl) {
      acts.push({
        label: isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        ),
        onClick: () => {
          let updated = [...favorites];
          if (isFavorited) {
            updated = updated.filter((u: string) => u !== stickerUrl);
          } else {
            updated.push(stickerUrl);
          }
          localStorage.setItem('anisync_favorite_stickers', JSON.stringify(updated));
          window.dispatchEvent(new Event('anisync_favorites_updated'));
        }
      });
    }

    // Delete only for own messages
    if (overlayMsg.userId === username) {
      acts.push({
        label: 'Sil',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        ),
        onClick: () => {
          getSocket()?.emit('chat:delete', { roomId, messageId: overlayMsg.id });
        },
        danger: true,
      });
    }
    return acts;
  }, [overlayMsg, username, roomId]);

  useEffect(() => {
    if (text === '' && editableRef.current) {
      editableRef.current.innerHTML = '';
    }
  }, [text]);

  const handleInput = () => {
    if (!editableRef.current) return;
    let parsed = '';
    editableRef.current.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        parsed += node.textContent;
      } else if (node.nodeName === 'IMG') {
        const e = (node as HTMLImageElement).getAttribute('data-emoji');
        const s = (node as HTMLImageElement).getAttribute('data-sticker');
        if (e) parsed += `[emoji:${e}]`;
        else if (s) parsed += `[sticker:${s}]`;
      } else if (node.nodeName === 'DIV' || node.nodeName === 'BR') {
        parsed += ' ';
      }
    });
    // This updates the zustand typing state and local text state
    handleTyping(parsed);
  };

  const insertEmoji = (emojiPath: string) => {
    if (!editableRef.current) return;
    
    const img = document.createElement('img');
    img.setAttribute('data-emoji', emojiPath);
    img.src = emojiPath.startsWith('http') ? emojiPath : `https://cdn.jsdelivr.net/gh/LunaticZen/live_wallpapers@main/emojis/${emojiPath}`;
    img.alt = "emoji";
    img.style.height = '24px';
    img.style.width = '24px';
    img.style.verticalAlign = 'middle';
    img.style.margin = '0 2px';
    img.style.userSelect = 'none';
    img.style.display = 'inline-block';
    img.setAttribute('contenteditable', 'false');
    if (document.activeElement === editableRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editableRef.current.appendChild(img);
      }
    } else {
      editableRef.current.appendChild(img);
    }
    handleInput();
  };

  const insertSticker = (stickerUrl: string) => {
    if (!editableRef.current) return;
    
    const img = document.createElement('img');
    img.setAttribute('data-sticker', stickerUrl);
    img.src = stickerUrl;
    img.alt = "sticker";
    img.style.height = '64px';
    img.style.width = '64px';
    img.style.verticalAlign = 'middle';
    img.style.margin = '0 4px';
    img.style.userSelect = 'none';
    img.style.display = 'inline-block';
    img.style.borderRadius = '8px';
    img.setAttribute('contenteditable', 'false');
    if (document.activeElement === editableRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editableRef.current.appendChild(img);
      }
    } else {
      editableRef.current.appendChild(img);
    }
    handleInput();
  };
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout>>();

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
    const cleanText = text.replace(/[\u200B]/g, '').trim();
    if (!cleanText) return;
    getSocket()?.emit('chat:message', { 
      roomId, 
      text: cleanText,
      replyTo: replyToMsg ? { id: replyToMsg.id, username: replyToMsg.displayName ?? replyToMsg.username, text: replyToMsg.text } : undefined
    });
    setText('');
    setReplyToMsg(null);
    setShowEmojiPicker(false);
    setShowStickerPicker(false);
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



  return (
    <div className="chat" style={{ containerType: 'size', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Chat Header — slides up and vanishes when keyboard opens */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isKeyboardOpen ? '0 14px' : '8px 14px',
        borderBottom: isKeyboardOpen ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
        flexShrink: 0,
        maxHeight: isKeyboardOpen ? 0 : 40,
        opacity: isKeyboardOpen ? 0 : 1,
        overflow: 'hidden',
        transition: 'opacity 0.2s ease', /* max-height and padding removed from transition */
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
        /* padding and gap removed from transition */
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

          return <SwipableMessage key={msg.id} msg={msg} i={i} username={username} members={members} messages={messages} activeTypers={activeTypers} isKeyboardOpen={isKeyboardOpen} activeTheme={activeTheme} effectiveIsLight={activeTheme.isLight} onReply={setReplyToMsg} onOpenOverlay={handleOpenOverlay} />;
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
          backdropFilter: 'none',
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
            <span style={{ fontSize: 12, opacity: 0.7, wordBreak: 'break-all', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {renderInputReplyText(replyToMsg.text)}
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
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex', alignItems: 'center',
        padding: isKeyboardOpen ? '4px 10px' : '8px 16px',
        paddingBottom: isKeyboardOpen ? '4px' : 'max(8px, env(safe-area-inset-bottom, 8px))',
        borderTop: replyToMsg ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : (activeTheme.isImage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)')}`,
        background: activeTheme.menuBg, flexShrink: 0,
        backdropFilter: 'none',
        transition: 'background 0.4s ease', /* padding removed from transition */
        position: 'relative', zIndex: 50
      }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          background: activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
          borderRadius: 9999,
          padding: '4px',
          gap: 8,
          transition: 'all 0.2s ease',
        }}>
          {/* Left Emoji Icon */}
          <div style={{ position: 'relative', display: 'flex' }}>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (!isKeyboardOpen) editableRef.current?.blur();
                setShowEmojiPicker(prev => !prev);
              }}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); }}
              onTouchEnd={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (!isKeyboardOpen) editableRef.current?.blur();
                setShowEmojiPicker(prev => !prev); 
              }}
              style={{ 
                background: 'none', border: 'none', padding: 0, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: activeTheme.textColor, 
                cursor: 'pointer', flexShrink: 0, marginLeft: 4, marginRight: 2 
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            {showEmojiPicker && (
              <EmojiPicker 
                onSelect={(emojiPath) => {
                  // extract path from [emoji:path]
                  const pathMatch = emojiPath.match(/\[emoji:(.+)\]/);
                  if (pathMatch) {
                    insertEmoji(pathMatch[1]);
                  }
                }}
                onClose={() => setShowEmojiPicker(false)}
                isLight={activeTheme.isLight}
                isImage={activeTheme.isImage}
                isKeyboardOpen={isKeyboardOpen}
              />
            )}
          </div>

          {/* Rich Input Field */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            {!text && (
              <div style={{
                position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                color: activeTheme.textColor, opacity: 0.6,
                pointerEvents: 'none', fontSize: 15, fontFamily: 'inherit'
              }}>
                Mesaj...
              </div>
            )}
            <div
              ref={editableRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={(e) => {
                e.target.scrollIntoView = () => {};
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 350);
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, pasted);
                handleInput();
              }}
              style={{
                flex: 1, minHeight: 34, padding: '7px 6px',
                background: 'transparent', border: 'none',
                color: activeTheme.textColor,
                fontSize: 15, fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box', overflowY: 'auto', maxHeight: 120,
                wordBreak: 'break-word', whiteSpace: 'pre-wrap'
              }}
            />
          </div>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 8, color: activeTheme.textColor, opacity: 0.8, flexShrink: 0 }}>
              {/* Gallery */}
              <button style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" ry="4"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </button>
              
              {/* Sticker */}
              <div style={{ position: 'relative', display: 'flex' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isKeyboardOpen) editableRef.current?.blur();
                    setShowStickerPicker(prev => !prev);
                  }}
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                  onTouchStart={e => { e.preventDefault(); e.stopPropagation(); }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isKeyboardOpen) editableRef.current?.blur();
                    setShowStickerPicker(prev => !prev);
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', cursor: 'pointer' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-.59 1.41l-4.83 4.83A2 2 0 0 1 14 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                    <path d="M14 21v-5a2 2 0 0 1 2-2h5" />
                    <circle cx="9" cy="9" r="1" fill="currentColor" />
                    <circle cx="15" cy="9" r="1" fill="currentColor" />
                    <path d="M9 13c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5" />
                  </svg>
                </button>
                {showStickerPicker && (
                  <StickerPicker
                    onSelect={(stickerUrl) => {
                      const rawUrl = stickerUrl.match(/\[sticker:(.+)\]/)?.[1] || stickerUrl;
                      getSocket()?.emit('chat:message', {
                        roomId,
                        text: `[sticker:${rawUrl}]`,
                        replyTo: replyToMsg ? { id: replyToMsg.id, username: replyToMsg.displayName ?? replyToMsg.username, text: replyToMsg.text } : undefined
                      });
                      setReplyToMsg(null);
                      setShowStickerPicker(false);
                    }}
                    onClose={() => setShowStickerPicker(false)}
                    activeTheme={activeTheme}
                  />
                )}
              </div>
              
              {/* Heart */}
              <button 
                className={isHeartClicked ? 'heart-pop-anim' : ''}
                onClick={() => {
                  getSocket()?.emit('chat:message', { roomId, text: '[emoji:heart-on-fire-new.png]' });
                  setIsHeartClicked(true);
                  setTimeout(() => setIsHeartClicked(false), 300);
                }}
                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isHeartClicked ? '#ef4444' : 'inherit', cursor: 'pointer' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={isHeartClicked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay Menu Portal — rendered to document.body */}
      <MessageOverlayMenu
        isOpen={overlayState.isOpen}
        onClose={closeMenu}
        actions={overlayActions}
        bubbleRect={overlayState.bubbleRect}
        isMe={overlayMsg?.userId === username}
        activeTheme={activeTheme}
        bubbleContent={
          overlayMsg ? (
            <div style={{
              background: overlayMsg.userId === username
                ? activeTheme.accent
                : (activeTheme.isLight ? '#f1f5f9' : (activeTheme.isImage ? 'rgba(0,0,0,0.5)' : '#334155')),
              color: overlayMsg.userId === username ? 'white' : activeTheme.textColor,
              padding: '8px 12px',
              borderRadius: 18,
              fontSize: 13,
              lineHeight: 1.4,
              wordBreak: 'break-word',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: overlayMsg.userId === username ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              {renderMessageText(overlayMsg.text, /^(\s*\[(emoji|sticker):[^\]]+\]\s*)+$/.test(overlayMsg.text))}
            </div>
          ) : null
        }
      />
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
}

export function RoomChat({ mode, roomId, members, isKeyboardOpen, tickerItems }: RoomChatProps) {
  if (mode === 'mobile-landscape') {
    return (
      <ChatTicker
        tickerItems={tickerItems || []}
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
