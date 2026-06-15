// ═══════════════════════════════════════════════════════════════
// MessageOverlayMenu — smart_overlay_menu inspired context menu
// Long-press (mobile) + Right-click (desktop) on chat messages
// Uses createPortal to document.body for blur + cloned bubble
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface OverlayMenuAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface MessageOverlayMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: OverlayMenuAction[];
  /** The bounding rect of the original bubble */
  bubbleRect: DOMRect | null;
  /** Cloned JSX of the bubble */
  bubbleContent: React.ReactNode;
  /** Whether the message is from the current user */
  isMe: boolean;
  /** Active theme for styling */
  activeTheme: any;
}

export function MessageOverlayMenu({
  isOpen, onClose, actions, bubbleRect, bubbleContent, isMe, activeTheme
}: MessageOverlayMenuProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'hidden'>('hidden');
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = useState(0);
  // Guard: ignore touch/click events right after opening to prevent
  // the touchend from long-press from immediately closing the overlay
  const openTimeRef = useRef(0);

  // Phase management
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      setPhase('enter');
      // Haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate(10);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('visible'));
      });
    } else if (phase === 'visible' || phase === 'enter') {
      setPhase('exit');
      const timer = setTimeout(() => setPhase('hidden'), 280);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Measure menu height for positioning
  useEffect(() => {
    if (menuRef.current && phase === 'visible') {
      setMenuHeight(menuRef.current.getBoundingClientRect().height);
    }
  }, [phase, actions.length]);

  // Close on Escape
  useEffect(() => {
    if (phase === 'hidden') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, onClose]);

  // Guarded close — ignores events within 500ms of opening
  const guardedClose = useCallback(() => {
    if (Date.now() - openTimeRef.current < 500) return;
    onClose();
  }, [onClose]);

  if (phase === 'hidden' || !bubbleRect) return null;

  const isVisible = phase === 'visible';
  const isEntering = phase === 'enter' || phase === 'visible';
  const isExiting = phase === 'exit';

  // Calculate bubble clone position — keep it at original position
  const bubbleTop = bubbleRect.top;
  const bubbleLeft = bubbleRect.left;
  const bubbleWidth = bubbleRect.width;

  // Menu positioning — show below the bubble, aligned to bubble edge
  const menuGap = 10;
  const screenPadding = 16;
  let menuTop = bubbleRect.bottom + menuGap;
  let showAbove = false;

  // If menu would go off bottom of screen, show above
  if (menuTop + menuHeight + screenPadding > window.innerHeight) {
    menuTop = bubbleRect.top - menuGap - menuHeight;
    showAbove = true;
  }
  // If menu would go off top of screen, clamp
  if (menuTop < screenPadding) {
    menuTop = screenPadding;
  }

  const menuLeft = isMe
    ? Math.max(screenPadding, bubbleRect.right - 180)
    : Math.min(bubbleLeft, window.innerWidth - 180 - screenPadding);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: isExiting ? 'none' : 'auto',
      }}
      onContextMenu={e => { e.preventDefault(); guardedClose(); }}
    >
      {/* Blurred backdrop — close on tap */}
      <div
        onClick={guardedClose}
        onTouchEnd={(e) => {
          // Only close if the touch target is the backdrop itself
          if (e.target === e.currentTarget && Date.now() - openTimeRef.current > 500) {
            e.preventDefault();
            onClose();
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: `blur(${isEntering ? 20 : 0}px)`,
          WebkitBackdropFilter: `blur(${isEntering ? 20 : 0}px)`,
          background: isEntering
            ? (activeTheme.isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)')
            : 'transparent',
          transition: isExiting ? 'all 0.25s ease-out' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />

      {/* Cloned bubble — floating above blur at exact original position */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          zIndex: 2,
          transform: isEntering ? 'scale(1)' : 'scale(0.95)',
          opacity: isEntering ? 1 : 0,
          transition: isExiting ? 'all 0.2s ease-out' : 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
          pointerEvents: 'none',
        }}
      >
        {bubbleContent}
      </div>

      {/* Action Menu */}
      <div
        ref={menuRef}
        onClick={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: menuTop,
          left: menuLeft,
          zIndex: 3,
          minWidth: 160,
          background: activeTheme.isLight
            ? 'rgba(255,255,255,0.92)'
            : 'rgba(30,30,45,0.92)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          borderRadius: 16,
          border: `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: activeTheme.isLight
            ? '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)'
            : '0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transform: isEntering
            ? 'scale(1) translateY(0)'
            : (showAbove ? 'scale(0.8) translateY(12px)' : 'scale(0.8) translateY(-12px)'),
          opacity: isEntering ? 1 : 0,
          transition: isExiting
            ? 'all 0.2s ease-out'
            : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: showAbove ? 'bottom center' : 'top center',
        }}
      >
        {actions.map((action, idx) => (
          <MenuButton
            key={idx}
            action={action}
            isLast={idx === actions.length - 1}
            activeTheme={activeTheme}
            onClose={onClose}
            delay={idx * 30}
            isVisible={isVisible}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

function MenuButton({ action, isLast, activeTheme, onClose, delay, isVisible }: {
  action: OverlayMenuAction;
  isLast: boolean;
  activeTheme: any;
  onClose: () => void;
  delay: number;
  isVisible: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const handleAction = useCallback(() => {
    action.onClick();
    onClose();
  }, [action, onClose]);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        handleAction();
      }}
      onTouchEnd={(e) => {
        // On mobile, use touchEnd directly for instant response
        e.stopPropagation();
        e.preventDefault();
        handleAction();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 18px',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${activeTheme.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
        background: hovered
          ? (activeTheme.isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)')
          : 'transparent',
        color: action.danger
          ? '#ef4444'
          : (activeTheme.isLight ? '#1e293b' : '#e2e8f0'),
        fontSize: 15,
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
        transitionDelay: `${delay}ms`,
        transitionProperty: 'opacity, transform, background',
        transitionDuration: '0.3s, 0.3s, 0.15s',
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.8 }}>
        {action.icon}
      </span>
      <span>{action.label}</span>
    </button>
  );
}

// ─── Hook for overlay menu state ────────────────────────────
export function useOverlayMenu() {
  const [overlayState, setOverlayState] = useState<{
    isOpen: boolean;
    msgId: string | null;
    bubbleRect: DOMRect | null;
  }>({ isOpen: false, msgId: null, bubbleRect: null });

  const openMenu = useCallback((msgId: string, bubbleElement: HTMLElement) => {
    const rect = bubbleElement.getBoundingClientRect();
    setOverlayState({ isOpen: true, msgId, bubbleRect: rect });
  }, []);

  const closeMenu = useCallback(() => {
    setOverlayState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { overlayState, openMenu, closeMenu };
}
