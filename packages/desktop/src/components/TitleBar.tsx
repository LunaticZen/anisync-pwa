// ═══════════════════════════════════════════════════════════════
// TitleBar — Custom frameless window title bar
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('anisync_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { }
  return 'dark';
}

export default function TitleBar() {
  const api = (window as any).anisync;
  const isMobile = !api;
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('anisync_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

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
        {/* Theme toggle */}
        <button className="titlebar__btn" onClick={toggleTheme} title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'} style={{ marginRight: isMobile ? 0 : 8 }}>
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

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
