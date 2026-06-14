// ═══════════════════════════════════════════════════════════════
// Room Page — Container & Sync Logic
// Refactored: UI components extracted to sub-modules.
// This file handles ONLY mode detection, sync logic, and layout composition.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore, useRoomStore, useSyncStore, useChatStore, useUIStore } from '../../stores';
import { getSocket } from '../../services/socket';
import { isElectron, isMobile, isXiaomi, getTheme, type RoomMode } from './constants';
import { RoomHeader } from './RoomHeader';
import { RoomChat, type TickerItem, DANMAKU_LANE_COUNT } from './RoomChat';
import { RoomVideoArea } from './RoomVideoArea';
import { RoomModals, MemberList } from './RoomModals';

export default function RoomPage() {
  const { currentRoom, members, pendingJoinRequests, theme: roomTheme } = useRoomStore();
  const activeTheme = getTheme(roomTheme);
  const { currentUrl } = useSyncStore();
  const [animeUrl, setAnimeUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [animeLoaded, setAnimeLoaded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [displayUrl, setDisplayUrl] = useState(currentUrl || '');
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(true);
  const resizingRef = useRef(false);
  const animeAreaRef = useRef<HTMLDivElement>(null);

  const syncBoundsToElectron = () => {
    if (!isElectron || !animeAreaRef.current) return;
    const rect = animeAreaRef.current.getBoundingClientRect();
    (window as any).anisync?.anime?.setBounds?.({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
  };

  if (!currentRoom) {
    (window as any).__anisyncRoomActive = false;
    return null;
  }
  // Set flag for Android native layer to check room status on resume
  (window as any).__anisyncRoomActive = true;

  // ══════════════════════════════════════════════════════════
  // SYNC LOGIC — DO NOT MODIFY
  // ══════════════════════════════════════════════════════════

  useEffect(() => {
    if (isElectron && currentUrl) {
      (window as any).anisync.anime.navigate(currentUrl);
      setAnimeLoaded(true);
      setTimeout(syncBoundsToElectron, 100);
      setTimeout(syncBoundsToElectron, 500);
    } else if (isElectron && !currentUrl) {
      (window as any).anisync.anime.close();
      setAnimeLoaded(false);
    }
  }, [currentUrl]);

  useEffect(() => {
    setBgLoaded(false);
    if (activeTheme.isImage && !activeTheme.isVideo && activeTheme.image) {
      const img = new Image();
      img.src = activeTheme.image;
      img.onload = () => setBgLoaded(true);
      img.onerror = () => setBgLoaded(true);
    } else if (!activeTheme.isVideo) {
      setBgLoaded(true);
    }
  }, [activeTheme.id]);

  useEffect(() => {
    if (!isElectron) return;
    const ro = new ResizeObserver(() => syncBoundsToElectron());
    if (animeAreaRef.current) ro.observe(animeAreaRef.current);
    window.addEventListener('resize', syncBoundsToElectron);
    return () => { ro.disconnect(); window.removeEventListener('resize', syncBoundsToElectron); };
  }, [animeLoaded]);

  useEffect(() => {
    if (!isElectron || !currentRoom) return;
    const isHost = currentRoom.hostId === useAuthStore.getState().username;
    if (!isHost) return;
    const cleanup = (window as any).anisync.anime.onNavigated((newUrl: string) => {
      const socket = getSocket();
      if (!socket || !currentRoom) return;
      const current = useSyncStore.getState().currentUrl;
      if (newUrl !== current && newUrl !== 'about:blank') {
        socket.emit('sync:url-changed', { roomId: currentRoom.id, url: newUrl });
        useSyncStore.getState().setCurrentUrl(newUrl);
      }
    });
    return cleanup;
  }, [currentRoom?.id, currentRoom?.hostId]);

  // ── PC: Video Sync Bridge ──
  useEffect(() => {
    if (!isElectron || !currentUrl || !currentRoom) return;
    const socket = getSocket();
    if (!socket) return;
    let ignoreUntil = 0;
    let lastEventTs = 0;

    const eventPoll = setInterval(async () => {
      try {
        const event = await (window as any).anisync.player.getEvent();
        if (event && event.ts > lastEventTs && Date.now() > ignoreUntil) {
          lastEventTs = event.ts;
          const { type, time } = event;
          if (type === 'play') socket.emit('sync:play', { roomId: currentRoom.id, time, generation: Date.now() });
          else if (type === 'pause') socket.emit('sync:pause', { roomId: currentRoom.id, time, generation: Date.now() });
          else if (type === 'seek') socket.emit('sync:seek', { roomId: currentRoom.id, time, generation: Date.now() });
        }
      } catch { }
    }, 500);

    const timecheckPoll = setInterval(async () => {
      try {
        const state = await (window as any).anisync.player.getState();
        if (!state || state.time === undefined) return;
        socket.emit('sync:timecheck', {
          roomId: currentRoom.id, time: state.time,
          playing: state.state === 'playing', userId: useAuthStore.getState().username,
        });
      } catch { }
    }, 5000);

    const onPlay = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
      (window as any).anisync.player.play();
    };
    const onPause = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
      (window as any).anisync.player.pause();
    };
    const onSeek = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      ignoreUntil = Date.now() + 1500;
      (window as any).anisync.player.seek(d.time);
    };
    const onTimecheck = (d: any) => {
      if (d.userId === useAuthStore.getState().username) return;
      (window as any).anisync.player.getState().then((state: any) => {
        if (!state || state.time === undefined) return;
        const drift = Math.abs(state.time - d.time);
        if (drift > 1.5) {
          ignoreUntil = Date.now() + 1500;
          (window as any).anisync.player.seek(d.time);
          if (d.playing && state.state !== 'playing') (window as any).anisync.player.play();
          if (!d.playing && state.state === 'playing') (window as any).anisync.player.pause();
        }
      }).catch(() => { });
    };

    socket.on('sync:play', onPlay);
    socket.on('sync:pause', onPause);
    socket.on('sync:seek', onSeek);
    socket.on('sync:timecheck', onTimecheck);
    return () => {
      clearInterval(eventPoll);
      clearInterval(timecheckPoll);
      socket.off('sync:play', onPlay);
      socket.off('sync:pause', onPause);
      socket.off('sync:seek', onSeek);
      socket.off('sync:timecheck', onTimecheck);
    };
  }, [currentUrl, currentRoom?.id]);

  // ── Mobile: Open anime via bridge ──
  useEffect(() => {
    if (isMobile && currentUrl) {
      if ((window as any).AniSyncBridge?.openAnime) {
        (window as any).AniSyncBridge.openAnime(currentUrl);
      } else {
        setTimeout(() => { window.location.href = currentUrl; }, 300);
      }
    }
  }, [currentUrl]);

  // ── Mobile: Sync events with drift correction ──
  useEffect(() => {
    if (!isMobile || !currentUrl || !currentRoom) return;
    const socket = getSocket();
    if (!socket) return;
    const bridge = (window as any).AniSyncBridge;
    if (!bridge?.controlAnime) return;

    let lastSyncTime = 0;
    let lastHostTime = 0;

    const onPlay = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('seek', d.time || 0);
      bridge.controlAnime('play', d.time || 0);
    };
    const onPause = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('seek', d.time || 0);
      bridge.controlAnime('pause', d.time || 0);
    };
    const onSeek = (d: any) => {
      if (d.originUserId === useAuthStore.getState().username) return;
      bridge.controlAnime('seek', d.time || 0);
    };
    const onTimecheck = (d: any) => {
      if (d.userId === useAuthStore.getState().username) return;
      const now = Date.now();
      if (now - lastSyncTime < 8000) return;
      const expectedHostTime = lastHostTime + (now - lastSyncTime) / 1000;
      const hostDrift = Math.abs(d.time - expectedHostTime);
      lastHostTime = d.time;
      lastSyncTime = now;
      if (hostDrift > 3) {
        bridge.controlAnime('seek', d.time || 0);
      }
      if (d.playing) bridge.controlAnime('play', d.time || 0);
    };

    socket.on('sync:play', onPlay);
    socket.on('sync:pause', onPause);
    socket.on('sync:seek', onSeek);
    socket.on('sync:timecheck', onTimecheck);
    return () => {
      socket.off('sync:play', onPlay);
      socket.off('sync:pause', onPause);
      socket.off('sync:seek', onSeek);
      socket.off('sync:timecheck', onTimecheck);
    };
  }, [currentUrl, currentRoom?.id]);

  // ── Mobile: Host URL tracking ──
  useEffect(() => {
    if (!isMobile || !currentRoom) return;
    const isHost = currentRoom.hostId === useAuthStore.getState().username;
    if (!isHost) return;
    (window as any).__anisyncUrlChanged = (newUrl: string) => {
      const socket = getSocket();
      const current = useSyncStore.getState().currentUrl;
      if (socket && newUrl !== current && newUrl !== 'about:blank') {
        socket.emit('sync:url-changed', { roomId: currentRoom.id, url: newUrl });
        useSyncStore.getState().setCurrentUrl(newUrl);
      }
    };
    return () => { delete (window as any).__anisyncUrlChanged; };
  }, [currentRoom?.id, currentRoom?.hostId]);

  // ══════════════════════════════════════════════════════════
  // UI STATE
  // ══════════════════════════════════════════════════════════

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [logCopied, setLogCopied] = useState(false);

  // Reactive bridge detection
  const [hasBridge, setHasBridge] = useState(() => typeof (window as any).AniSyncBridge !== 'undefined');
  useEffect(() => {
    if (hasBridge) return;
    const check = setInterval(() => {
      if (typeof (window as any).AniSyncBridge !== 'undefined') {
        setHasBridge(true);
        clearInterval(check);
      }
    }, 500);
    const stop = setTimeout(() => clearInterval(check), 10000);
    return () => { clearInterval(check); clearTimeout(stop); };
  }, [hasBridge]);

  const myUsername = useAuthStore(s => s.username);
  const chatMessages = useChatStore(s => s.messages);

  // ── Reliable device orientation detection ──
  const getDevicePortrait = (): boolean => {
    if (isElectron) return false;
    const ot = (window.screen as any)?.orientation?.type;
    if (ot) return ot.includes('portrait');
    if (window.screen?.height && window.screen?.width) {
      return window.screen.height > window.screen.width;
    }
    return window.innerHeight > window.innerWidth;
  };

  const [isPortrait, setIsPortrait] = useState(getDevicePortrait);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const initialVpHeight = useRef(window.innerHeight);

  // ── Native fullscreen state (Android bridge) ──
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // Portrait + fullscreen → behave like landscape (show danmaku, hide header)
  const effectiveLandscape = !isPortrait || isNativeFullscreen;

  // ── Landscape ticker state ──
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const shownTickerIds = useRef(new Set<string>());
  const tickerKeyCounter = useRef(0);

  useEffect(() => {
    shownTickerIds.current.clear();
    setTickerItems([]);
    tickerKeyCounter.current = 0;
  }, [currentUrl]);

  // ── Mobile: Track viewport height for keyboard detection ──
  useEffect(() => {
    if (!isMobile) return;
    
    // Fallback if visualViewport is unavailable
    const vv = window.visualViewport;
    
    const initTimer = setTimeout(() => {
      initialVpHeight.current = vv ? vv.height : window.innerHeight;
      setViewportHeight(vv ? vv.height : window.innerHeight);
    }, 500);

    const onResize = () => {
      const h = vv ? vv.height : window.innerHeight;
      setViewportHeight(h);
      setIsKeyboardOpen(h < initialVpHeight.current * 0.75);
    };

    if (vv) {
      vv.addEventListener('resize', onResize);
    } else {
      window.addEventListener('resize', onResize);
    }

    return () => {
      if (vv) vv.removeEventListener('resize', onResize);
      else window.removeEventListener('resize', onResize);
      clearTimeout(initTimer);
    };
  }, []);

  // ── Orientation change listeners ──
  useEffect(() => {
    if (isElectron) return;
    (window as any).__anisyncSetOrientation = (portrait: boolean) => {
      setIsPortrait(portrait);
    };
    const handleOrientationAPI = () => setIsPortrait(getDevicePortrait());
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationAPI);
    }
    const handleResize = () => setIsPortrait(getDevicePortrait());
    window.addEventListener('resize', handleResize);
    return () => {
      delete (window as any).__anisyncSetOrientation;
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationAPI);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ── Native fullscreen listener (Android bridge signal) ──
  useEffect(() => {
    if (!isMobile) return;
    (window as any).__anisyncSetFullscreen = (fs: boolean) => {
      setIsNativeFullscreen(fs);
    };
    return () => { delete (window as any).__anisyncSetFullscreen; };
  }, []);

  // ── Overlay mode (landscape OR fullscreen): make body transparent so video shows through ──
  useEffect(() => {
    const isOverlayMode = isMobile && !!currentUrl && effectiveLandscape;
    if (isOverlayMode) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      const root = document.getElementById('root');
      if (root) root.style.background = 'transparent';
    } else if (isMobile) {
      document.documentElement.style.background = '';
      document.body.style.background = '';
      const root = document.getElementById('root');
      if (root) root.style.background = '';
    }
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
      const root = document.getElementById('root');
      if (root) root.style.background = '';
    };
  }, [effectiveLandscape, currentUrl]);

  // ── Landscape ticker: add new messages ──
  const landscapeSeeded = useRef(false);
  useEffect(() => {
    if (!isMobile || !effectiveLandscape || !currentUrl) {
      landscapeSeeded.current = false;
      return;
    }
    if (!landscapeSeeded.current) {
      chatMessages.forEach(m => {
        if (m.id) shownTickerIds.current.add(m.id);
      });
      landscapeSeeded.current = true;
      return;
    }
    const newMsgs = chatMessages.filter(m =>
      m.type !== 'system' &&
      m.userId !== myUsername &&
      m.id &&
      !shownTickerIds.current.has(m.id)
    );
    if (newMsgs.length > 0) {
      const items = newMsgs.map(m => {
        shownTickerIds.current.add(m.id);
        tickerKeyCounter.current++;
        return {
          id: m.id,
          username: (m as any).displayName ?? m.username ?? '?',
          text: m.text,
          key: tickerKeyCounter.current,
          lane: tickerKeyCounter.current % DANMAKU_LANE_COUNT,
        };
      });
      setTickerItems(prev => [...prev, ...items].slice(-10));

      if (shownTickerIds.current.size > 500) {
        const entries = Array.from(shownTickerIds.current);
        const excess = entries.length - 500;
        for (let i = 0; i < excess; i++) {
          shownTickerIds.current.delete(entries[i]);
        }
      }
    }
  }, [chatMessages, effectiveLandscape, currentUrl]);

  const removeTickerItem = (key: number) => {
    setTickerItems(prev => prev.filter(item => item.key !== key));
  };

  // ── Android back button → show leave confirmation ──
  useEffect(() => {
    if (!isMobile) return;

    // 1. Popstate (Eski tarayıcı geçmişi yöntemi - güvenlik için tutulabilir)
    const pushFakeState = () => {
      try { window.history.pushState({ anisyncRoom: true }, ''); } catch(e) {}
    };
    pushFakeState();
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setShowLeaveConfirm(true);
      pushFakeState();
    };
    window.addEventListener('popstate', handlePopState);

    // 2. YENİ: Android'den gelen doğrudan geri tuşu sinyali!
    const handleHardwareBack = () => {
      setShowLeaveConfirm(true);
    };
    window.addEventListener('hardwareBackPress', handleHardwareBack as any);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hardwareBackPress', handleHardwareBack as any);
    };
  }, []);

  // ── Handlers ──
  const handleLeave = () => {
    const socket = getSocket();
    socket?.emit('room:leave', { roomId: currentRoom.id });
    if (isElectron) (window as any).anisync.anime.close();
    if (isMobile && (window as any).AniSyncBridge?.closeAnime) (window as any).AniSyncBridge.closeAnime();
    useRoomStore.getState().leaveRoom();
    useChatStore.getState().clear();
    useSyncStore.getState().setCurrentUrl(null);
    useUIStore.getState().setView('home');
  };

  const handleNavigate = () => {
    if (!animeUrl.trim()) return;
    let url = animeUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const socket = getSocket();
    (socket as any)?.emit('sync:url-changed', { roomId: currentRoom.id, url });
    useSyncStore.getState().setCurrentUrl(url);
    setShowUrlInput(false);
    setAnimeUrl('');
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(currentRoom.code).catch(() => { });
  };

  const handleNavUrlSubmit = () => {
    if (!displayUrl.trim()) return;
    let url = displayUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const socket = getSocket();
    (socket as any)?.emit('sync:url-changed', { roomId: currentRoom.id, url });
    useSyncStore.getState().setCurrentUrl(url);
  };

  const handleCopyLogs = async () => {
    try {
      const bridge = (window as any).AniSyncBridge;
      if (bridge?.copyLogs) {
        bridge.copyLogs();
      } else if (bridge?.getLogs) {
        const logs = bridge.getLogs();
        await navigator.clipboard?.writeText(logs || 'Loglar boş');
      } else {
        const jsLogs = [
          '=== AniSync JS Diagnostics ===',
          `Time: ${new Date().toISOString()}`,
          `UserAgent: ${navigator.userAgent}`,
          `URL: ${window.location.href}`,
          `Bridge: ${typeof bridge}`,
          `Online: ${navigator.onLine}`,
          `Room: ${currentRoom?.id || 'none'}`,
          `CurrentUrl: ${currentUrl || 'none'}`,
          `Members: ${members?.length || 0}`,
          `Screen: ${screen.width}x${screen.height}`,
          `Viewport: ${window.innerWidth}x${window.innerHeight}`,
          `isMobile: ${isMobile}`,
          `isElectron: ${isElectron}`,
          '===============================',
        ].join('\n');
        await navigator.clipboard?.writeText(jsLogs);
      }
    } catch(e) {
      console.error('Log copy failed:', e);
    }
    setLogCopied(true);
    setTimeout(() => setLogCopied(false), 1500);
  };

  // ── Sidebar resize (desktop & mobile pre-anime) ──
  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!resizingRef.current) return;
      if (!isElectron && isPortrait) {
        const newH = Math.max(100, Math.min(window.innerHeight * 0.7, window.innerHeight - clientY));
        setSidebarWidth(newH);
      } else {
        const newW = Math.max(120, Math.min(window.innerWidth * 0.75, window.innerWidth - clientX));
        setSidebarWidth(newW);
        if (isElectron) syncBoundsToElectron();
      }
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onEnd = () => { resizingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isPortrait]);

  // ── Fix #1: Electron BrowserView z-index — hide anime when modals open ──
  const anyModalOpen = showThemes || showLeaveConfirm || showProfileModal;
  useEffect(() => {
    if (!isElectron || !animeLoaded) return;
    const anime = (window as any).anisync?.anime;
    if (!anime) return;
    if (anyModalOpen) {
      anime.hide?.();
    } else {
      anime.show?.();
    }
  }, [anyModalOpen, animeLoaded]);

  useEffect(() => {
    if (!isElectron || !currentUrl) return;
    setDisplayUrl(currentUrl);
    const cleanup = (window as any).anisync.anime.onNavigated((url: string) => { setDisplayUrl(url); });
    return cleanup;
  }, [currentUrl]);

  // ══════════════════════════════════════════════════════════
  // MODE DETECTION
  // ══════════════════════════════════════════════════════════
  const mobileAnimeActive = isMobile && !!currentUrl;
  const mode: RoomMode = mobileAnimeActive
    ? (effectiveLandscape ? 'mobile-landscape' : 'mobile-portrait')
    : 'desktop';

  // ══════════════════════════════════════════════════════════
  // SHARED HEADER PROPS
  // ══════════════════════════════════════════════════════════
  const headerProps = {
    mode,
    roomName: currentRoom.name,
    roomCode: currentRoom.code,
    memberCount: members.length,
    maxMembers: currentRoom.maxMembers,
    pendingRequestCount: pendingJoinRequests.length,
    activeTheme,
    currentUrl,
    isKeyboardOpen,
    hasBridge,
    logCopied,
    onBack: () => setShowLeaveConfirm(true),
    onShowMembers: () => setShowMembers(!showMembers),
    onShowThemes: () => setShowThemes(!showThemes),
    onCopyLogs: handleCopyLogs,
    onCopyCode: handleCopyCode,
    onShowProfile: () => setShowProfileModal(true),
    onShowUrlInput: () => setShowUrlInput(!showUrlInput),
    showUrlInput,
  };

  const modalProps = {
    mode,
    showMembers,
    members,
    pendingJoinRequests,
    hostId: currentRoom.hostId,
    onCloseMembers: () => setShowMembers(false),
    showThemes,
    roomId: currentRoom.id,
    onCloseThemes: () => setShowThemes(false),
    showLeaveConfirm,
    roomName: currentRoom.name,
    onConfirmLeave: handleLeave,
    onCancelLeave: () => setShowLeaveConfirm(false),
    showProfileModal,
    onCloseProfile: () => {
      setShowProfileModal(false);
      if (isElectron && animeLoaded) (window as any).anisync?.anime?.show?.();
    },
  };

  // ══════════════════════════════════════════════════════════
  // RENDER — Single layout, mode-aware sub-components
  // ══════════════════════════════════════════════════════════

  // ── Background style helper for image themes ──
  const bgStyle: React.CSSProperties = (activeTheme.isImage && !activeTheme.isVideo)
    ? { backgroundImage: `url(${activeTheme.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', transition: 'opacity 0.4s ease', opacity: bgLoaded ? 1 : 0 }
    : {};

  const renderVideoBackground = () => {
    // Hide video bg in mobile overlay mode — Xiaomi SOFTWARE layer can't render HW video
    if (!activeTheme.isVideo || (isMobile && effectiveLandscape && currentUrl)) return null;
    return (
      <>
        <video
          autoPlay
          loop
          muted
          playsInline
          src={activeTheme.video}
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          onCanPlay={() => setBgLoaded(true)}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none', backgroundColor: '#000', transition: 'opacity 0.4s ease', opacity: bgLoaded ? 1 : 0 }}
        />
        {/* Dark overlay for readability */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.55) 100%)',
          zIndex: 0, pointerEvents: 'none',
        }} />
      </>
    );
  };

  const renderBgLoader = () => {
    if (bgLoaded) return null;
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5, 8, 22, 0.65)',
        zIndex: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        backdropFilter: 'none',
      }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  };

  if (mode === 'mobile-landscape') {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'transparent', color: activeTheme.textColor,
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {renderVideoBackground()}
        {renderBgLoader()}
        {/* Header hidden in landscape/fullscreen for clean video view */}
        <RoomChat
          mode={mode}
          roomId={currentRoom.id}
          members={members}
          tickerItems={tickerItems}
          onRemoveTickerItem={removeTickerItem}
        />
        <RoomModals {...modalProps} />
      </div>
    );
  }

  if (mode === 'mobile-portrait') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: (activeTheme.isImage || activeTheme.isVideo) ? '#050816' : activeTheme.bg,
        color: activeTheme.textColor,
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
        position: 'fixed', top: 0, left: 0,
        transition: 'background 0.4s ease, color 0.4s ease',
        ...bgStyle,
      }}>
        {/* Video background for live themes */}
        {renderVideoBackground()}
        {renderBgLoader()}
        {/* Glass overlay for image/video themes */}
        {(activeTheme.isImage || activeTheme.isVideo) && <div style={{
          position: 'absolute', inset: 0,
          background: activeTheme.glassColor,
          zIndex: 0,
        }} />}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <RoomHeader {...headerProps} />
          <RoomChat
            mode={mode}
            roomId={currentRoom.id}
            members={members}
            isKeyboardOpen={isKeyboardOpen}
          />
          <RoomModals {...modalProps} />
        </div>
      </div>
    );
  }

  // ── Desktop (includes mobile pre-anime) ──
  const desktopBg = (activeTheme.isImage || activeTheme.isVideo)
    ? activeTheme.glassColor
    : `${activeTheme.bg}dd`;
  const sidebarBg = (activeTheme.isImage || activeTheme.isVideo)
    ? activeTheme.glassColor
    : `${activeTheme.bg}dd`;

  return (
    <>
      {/* Fullscreen background: video — hidden in mobile overlay mode (Xiaomi SOFTWARE layer can't render HW video) */}
      {activeTheme.isVideo && !(isMobile && effectiveLandscape && currentUrl) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
        }}>
          <video
            autoPlay loop muted playsInline
            src={activeTheme.video}
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            onCanPlay={() => setBgLoaded(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000', transition: 'opacity 0.4s ease', opacity: bgLoaded ? 1 : 0 }}
          />
          {/* Dark overlay for readability */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.5) 100%)',
          }} />
        </div>
      )}
      {activeTheme.isImage && !activeTheme.isVideo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1,
          backgroundImage: `url(${activeTheme.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'opacity 0.4s ease', opacity: bgLoaded ? 1 : 0
        }} />
      )}

      <div className="app__main" style={{
        display: 'flex', flexDirection: 'column',
        background: desktopBg,
        color: activeTheme.textColor,
        transition: 'background 0.4s ease, color 0.4s ease',
        position: 'relative',
        backdropFilter: 'none',
      }}>
        {renderVideoBackground()}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <RoomHeader {...headerProps} />
          <RoomVideoArea
            mode={mode}
            currentUrl={currentUrl}
            animeAreaRef={animeAreaRef}
            animeLoaded={animeLoaded}
            displayUrl={displayUrl}
            onDisplayUrlChange={setDisplayUrl}
            onNavUrlSubmit={handleNavUrlSubmit}
            showUrlInput={showUrlInput}
            animeUrl={animeUrl}
            onAnimeUrlChange={setAnimeUrl}
            onNavigate={handleNavigate}
            onToggleUrlInput={() => setShowUrlInput(false)}
          />
        </div>
      </div>

      {/* Resize handle */}
      <div className="resize-handle"
        onMouseDown={() => { resizingRef.current = true; document.body.style.cursor = isPortrait && !isElectron ? 'ns-resize' : 'ew-resize'; }}
        onTouchStart={() => { resizingRef.current = true; }}
        style={{
          ...(isPortrait && !isElectron
            ? { width: '100%', height: 10, cursor: 'ns-resize' }
            : { width: 6, height: 'auto', cursor: 'ew-resize' }),
          background: 'var(--border)', transition: 'background 0.15s',
          position: 'relative', flexShrink: 0, touchAction: 'none',
        }}
      />
      {renderBgLoader()}
      {/* ── Main App Container ── */}
      <div className="app__sidebar" style={{
        ...(isPortrait && !isElectron
          ? { height: sidebarWidth, width: '100%', maxHeight: '70vh', minHeight: 100 }
          : { width: sidebarWidth, minWidth: 120, maxWidth: '75vw' }),
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: sidebarBg,
        backdropFilter: 'none',
        color: activeTheme.textColor,
        transition: 'background 0.4s ease, color 0.4s ease',
      }}>
        <MemberList members={members} hostId={currentRoom.hostId} pendingRequests={pendingJoinRequests} />
        <RoomChat mode={mode} roomId={currentRoom.id} members={members} />
      </div>

      <RoomModals {...modalProps} />
    </>
  );
}
