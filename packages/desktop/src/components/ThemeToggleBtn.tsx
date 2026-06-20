import React from 'react';
import { useUIStore } from '../stores';

export default function ThemeToggleBtn({ size = 20, color = 'var(--text-muted)', style }: { size?: number, color?: string, style?: React.CSSProperties }) {
  const { theme, setTheme } = useUIStore();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <button onClick={toggleTheme} title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'} style={{
      background: 'none', border: 'none', color, cursor: 'pointer',
      padding: 6, borderRadius: 12, display: 'flex', transition: 'color 0.2s',
      ...style
    }}>
      {theme === 'dark' ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
