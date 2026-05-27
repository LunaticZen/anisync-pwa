// ═══════════════════════════════════════════════════════════════
// App Root Component — View Router & Layout
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { useUIStore } from './stores';
import TitleBar from './components/TitleBar';
import Toasts from './components/Toasts';
import HomePage from './components/HomePage';
import LobbyPage from './components/LobbyPage';
import RoomPage from './components/RoomPage';

export default function App() {
  const { currentView } = useUIStore();

  const renderView = () => {
    switch (currentView) {
      case 'lobby': return <div className="app__main"><LobbyPage /></div>;
      case 'room': return <RoomPage />;
      default: return <div className="app__main"><HomePage /></div>;
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
