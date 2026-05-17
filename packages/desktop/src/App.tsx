// ═══════════════════════════════════════════════════════════════
// App Root Component — View Router & Layout
// ═══════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useAuthStore, useUIStore, useRoomStore } from './stores';
import TitleBar from './components/TitleBar';
import Toasts from './components/Toasts';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import LobbyPage from './components/LobbyPage';
import RoomPage from './components/RoomPage';

declare global {
  interface Window {
    anisync: import('../electron/preload').AnisyncAPI;
  }
}

export default function App() {
  const { currentView } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  // Auto-redirect based on auth state
  useEffect(() => {
    if (!isAuthenticated && currentView !== 'login' && currentView !== 'register') {
      useUIStore.getState().setView('login');
    }
  }, [isAuthenticated, currentView]);

  // Try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('anisync_tokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored);
        // TODO: Validate token and fetch user profile
        // For now, just redirect to login
      } catch { /* ignore */ }
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'room': return <RoomPage />;
      case 'lobby':
      case 'discover':
      default:
        return isAuthenticated ? <LobbyPage /> : <LoginPage />;
    }
  };

  return (
    <>
      <TitleBar />
      <div className="app">
        <div className="app__content">
          {renderView()}
        </div>
      </div>
      <Toasts />
    </>
  );
}
