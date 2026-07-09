// ═══════════════════════════════════════════════════════════════
// TitleBar — Custom frameless window title bar
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { useUIStore } from '../stores';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function TitleBar() {
  const api = (window as any).anisync;
  const isMobile = !api;
  const { theme, setTheme } = useUIStore();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="titlebar">
      <div className="titlebar__logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4f6ef7" /><stop offset="100%" stopColor="#8ba5ff" /></linearGradient></defs>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        AniSync
      </div>

      <div className="titlebar__controls">
        <ThemeToggleBtn size={14} color="inherit" style={{ marginRight: isMobile ? 0 : 8, width: 36, height: 28, justifyContent: 'center' }} />

        {!isMobile && (
          <>
            <button className="titlebar__btn" onClick={() => api?.window.minimize()} title="Küçült">
              <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor" rx="0.5" /></svg>
            </button>
            <button className="titlebar__btn" onClick={() => api?.window.maximize()} title="Büyüt">
              <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2" rx="1.5" /></svg>
            </button>
            <button className="titlebar__btn titlebar__btn--close" onClick={() => api?.window.close()} title="Kapat">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
