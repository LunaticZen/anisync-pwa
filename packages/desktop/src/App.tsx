// ═══════════════════════════════════════════════════════════════
// App Root Component — View Router & Layout
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { useUIStore, useAuthStore } from './stores';
import TitleBar from './components/TitleBar';
import Toasts from './components/Toasts';
import HomePage from './components/HomePage';
import LobbyPage from './components/LobbyPage';
import RoomPage from './components/RoomPage';
import AccessCodePage from './components/AccessCodePage';

export default function App() {
  const { currentView } = useUIStore();
  const accessCode = useAuthStore(s => s.accessCode);

  // If no access code saved, force lock screen (unless already on it)
  const effectiveView = (!accessCode && currentView !== 'access') ? 'access' : currentView;

  const renderView = () => {
    switch (effectiveView) {
      case 'access': return <AccessCodePage />;
      case 'lobby': return <div className="app__main"><LobbyPage /></div>;
      case 'room': return <RoomPage />;
      default: return <div className="app__main"><HomePage /></div>;
    }
  };

  return (
    <>
      {effectiveView !== 'access' && <TitleBar />}
      <div className="app">
        <div className="app__content">
          {renderView()}
        </div>
      </div>
      <Toasts />
    </>
  );
}
