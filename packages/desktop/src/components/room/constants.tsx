// ═══════════════════════════════════════════════════════════════
// Room — Shared Constants, Device Detection & Helpers
// ═══════════════════════════════════════════════════════════════

// ── Device Detection ──
export const isElectron = !!(window as any).anisync;
// Detect mobile: user agent OR AniSyncBridge presence (Samsung WebView may not match regex)
export const isMobile = (
  /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
  typeof (window as any).AniSyncBridge !== 'undefined'
) && !isElectron;

export const isXiaomi = /Xiaomi|MIUI|Redmi|POCO|Mi /i.test(navigator.userAgent);
export const isSamsung = /Samsung|SM-/i.test(navigator.userAgent);

// ── Device-specific constants ──
export const TOUCH_SIZE = isXiaomi ? 48 : 44;        // MIUI gesture zones need larger targets
export const HEADER_PAD = isXiaomi ? '10px 14px' : '8px 12px';
export const ANIM_SPEED = isXiaomi ? '0.5s' : '0.3s'; // MIUI compositor is slower
export const ICON_SIZE = isXiaomi ? 20 : 18;
export const FONT_HEADER = isXiaomi ? 15 : 14;
export const SAFE_TOP = isXiaomi ? 4 : 0;             // Extra MIUI status bar padding

// ── Color Theme Definitions (Legacy) ──
export const COLOR_THEMES = [
  { id: 'night',   name: 'Gece',       bg: '#0d0d1a', text: '#e2e8f0', accent: '#5b7cff', lightBg: '#f0f1f5', lightText: '#1e293b' },
  { id: 'ocean',   name: 'Okyanus',    bg: '#0c1929', text: '#94d2e8', accent: '#38bdf8', lightBg: '#e8f4fc', lightText: '#0c4a6e' },
  { id: 'forest',  name: 'Orman',      bg: '#0d1a0d', text: '#a8e6a8', accent: '#22c55e', lightBg: '#ecfdf5', lightText: '#14532d' },
  { id: 'lavender',name: 'Lavanta',    bg: '#1a0d2e', text: '#d4b8ff', accent: '#a855f7', lightBg: '#f3e8ff', lightText: '#4c1d95' },
  { id: 'sunset',  name: 'Gün Batımı', bg: '#1a0d0d', text: '#ffb8a8', accent: '#f97316', lightBg: '#fff7ed', lightText: '#7c2d12' },
  { id: 'snow',    name: 'Kar',        bg: '#1a1e2e', text: '#e8ecf4', accent: '#94a3b8', lightBg: '#f8fafc', lightText: '#334155' },
  { id: 'cherry',  name: 'Kiraz',      bg: '#1a0d18', text: '#ffb8d4', accent: '#ec4899', lightBg: '#fdf2f8', lightText: '#831843' },
  { id: 'gold',    name: 'Altın',      bg: '#1a1500', text: '#ffd700', accent: '#eab308', lightBg: '#fefce8', lightText: '#713f12' },
  { id: 'neon',    name: 'Neon',       bg: '#0a0a1a', text: '#00ff88', accent: '#00ff88', lightBg: '#ecfef5', lightText: '#064e3b' },
  { id: 'crimson', name: 'Kırmızı',    bg: '#1a0808', text: '#ff6b6b', accent: '#ef4444', lightBg: '#fef2f2', lightText: '#7f1d1d' },
] as const;

// Backward compat
export const THEMES = COLOR_THEMES;
export type Theme = (typeof COLOR_THEMES)[number];

// ── Image Theme System ──

export interface ImageTheme {
  id: string;
  name: string;
  category: string;
  image?: string;
  video?: string;
  thumbnailVideo?: string;
  isVideo?: boolean;
  isLight: boolean;
  textColor: string;
  glassColor: string;
  accentColor: string;
  menuBg: string;
}

import React from 'react';

export interface ThemeCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export const IMAGE_THEME_CATEGORIES: ThemeCategory[] = [
  { id: 'live',    name: 'Canlı',     icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <style>
        {`
          @keyframes pulseLive {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.6; stroke: #38bdf8; }
            100% { transform: scale(1); opacity: 1; }
          }
          .live-icon-circle {
            animation: pulseLive 2s infinite ease-in-out;
            transform-origin: center;
          }
        `}
      </style>
      <circle className="live-icon-circle" cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  )},
  { id: 'moon',    name: 'Ay',        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> },
  { id: 'pattern', name: 'Desenler',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg> },
  { id: 'nature',  name: 'Doğa',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 22 12 12"/></svg> },
  { id: 'cats',    name: 'Kediler',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"></path><path d="M8 14v.5"></path><path d="M16 14v.5"></path><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"></path></svg> },
  { id: 'frames',  name: 'Çerçeveler', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> },
];

// Per-photo unique colors — each theme's accent, menuBg, glassColor matched to its individual photo
export const IMAGE_THEMES: ImageTheme[] = [
  // ── Live Video Themes ──
  { id: 'live:imperial', name: 'Imperial Rest', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/da7d610c-77db-45f7-9a4d-602c5e8759c3', thumbnailVideo: './themes/live/thumbs/imperial-rest.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#38bdf8', glassColor: 'rgba(10,15,30,0.60)', menuBg: 'rgba(15,20,40,0.80)' },
  { id: 'live:blurred_sunset', name: 'Yağmurlu Gün Batımı', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/db8ab85f-df0e-4b4d-9b21-677010effd05', thumbnailVideo: './themes/live/thumbs/blurred-sunset-while-raining.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#fb923c', glassColor: 'rgba(30,15,10,0.60)', menuBg: 'rgba(40,20,15,0.80)' },
  { id: 'live:cartethyia', name: 'Cartethyia Yansımaları', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/0f3b2477-a2f3-41d5-a678-9d2aa371f60f', thumbnailVideo: './themes/live/thumbs/cartethyia-reflections-beneath.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#2dd4bf', glassColor: 'rgba(10,20,30,0.60)', menuBg: 'rgba(15,30,40,0.80)' },
  { id: 'live:evening_drive', name: 'Akşam Sürüşü', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/4aca7612-b966-4fb0-bb70-c242e49b5666', thumbnailVideo: './themes/live/thumbs/evening-drive-and-windmills.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#c084fc', glassColor: 'rgba(20,10,30,0.60)', menuBg: 'rgba(30,15,40,0.80)' },
  { id: 'live:forest_creek', name: 'Orman Deresi', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/874784da-3f94-4d50-a46f-1b067633bbd2', thumbnailVideo: './themes/live/thumbs/forest-creek.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#4ade80', glassColor: 'rgba(10,25,15,0.60)', menuBg: 'rgba(15,35,20,0.80)' },
  { id: 'live:gamer_chisa', name: 'Oyuncu Chisa', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/68428597-e07c-4305-bb2f-3f922ef1fca4', thumbnailVideo: './themes/live/thumbs/gamer-chisa-wuthering-waves.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#ec4899', glassColor: 'rgba(30,10,25,0.60)', menuBg: 'rgba(40,15,35,0.80)' },
  { id: 'live:jellyfish', name: 'Denizanaları', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/d70a360f-17ee-4af5-b51e-54dc5bb27f42', thumbnailVideo: './themes/live/thumbs/jellyfish-swarm.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#a78bfa', glassColor: 'rgba(15,10,40,0.60)', menuBg: 'rgba(20,15,50,0.80)' },
  { id: 'live:lake_snowy', name: 'Karlı Zirveler', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/6e8c8b79-1270-4c5b-b100-8faea8e3b982', thumbnailVideo: './themes/live/thumbs/lake-by-snowy-peaks.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#93c5fd', glassColor: 'rgba(15,25,40,0.60)', menuBg: 'rgba(20,35,50,0.80)' },
  { id: 'live:lake_windy', name: 'Rüzgarlı Göl', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/38d23c79-25b8-40ca-beb7-1c4857c9a8ce', thumbnailVideo: './themes/live/thumbs/lake-on-windy-day.1920x1080.mp4', isLight: true, textColor: '#0F172A', accentColor: '#64748b', glassColor: 'rgba(220,230,240,0.50)', menuBg: 'rgba(230,240,250,0.84)' },
  { id: 'live:lucy_ww', name: 'Alevli Lucy', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/6ef4a02f-fbf2-45b9-a335-6752a9077e90', thumbnailVideo: './themes/live/thumbs/lucy-wuthering-waves.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#ef4444', glassColor: 'rgba(35,10,10,0.60)', menuBg: 'rgba(45,15,15,0.80)' },
  { id: 'live:raindrop', name: 'Camda Yağmur', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/f05cdd64-eb20-4132-bd97-8206935bb7b8', thumbnailVideo: './themes/live/thumbs/raindrop-on-window.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#94a3b8', glassColor: 'rgba(20,25,30,0.60)', menuBg: 'rgba(30,35,40,0.80)' },
  { id: 'live:shorekeeper', name: 'Shorekeeper', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/7b958516-07f1-490f-9161-c1517816ba44', thumbnailVideo: './themes/live/thumbs/shorekeeper-music-of-the-tides.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#0ea5e9', glassColor: 'rgba(10,20,45,0.60)', menuBg: 'rgba(15,30,60,0.80)' },
  { id: 'live:solitary', name: 'Yalnız Yansıma', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/a78b82fd-ffd4-42a8-bb5d-f3f84d5950c9', thumbnailVideo: './themes/live/thumbs/solitary-reflection.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#fcd34d', glassColor: 'rgba(25,20,10,0.60)', menuBg: 'rgba(35,30,15,0.80)' },
  { id: 'live:wave_symphony', name: 'Dalga Senfonisi', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/8b045b2d-2844-4b4c-86a2-598880fa08eb', thumbnailVideo: './themes/live/thumbs/wave-symphony.1920x1080.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#0284c7', glassColor: 'rgba(5,20,35,0.60)', menuBg: 'rgba(10,30,50,0.80)' },

  // ── Chiikawa (Live) ──
  { id: 'live:chiikawa_1', name: 'Chiikawa 1', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/192b8bcc-b5b8-4a07-9316-ba43d22b8261', thumbnailVideo: './themes/live/thumbs/chiikawa-1.mp4', isLight: true, textColor: '#0F172A', accentColor: '#92400e', glassColor: 'rgba(236,235,219,0.50)', menuBg: 'rgba(246,245,229,0.84)' },
  { id: 'live:chiikawa_2', name: 'Chiikawa 2', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/4f942415-274b-4e59-b8b2-8e47fc94cb08', thumbnailVideo: './themes/live/thumbs/chiikawa-2.mp4', isLight: true, textColor: '#0F172A', accentColor: '#b45309', glassColor: 'rgba(228,206,175,0.50)', menuBg: 'rgba(238,216,185,0.84)' },
  { id: 'live:chiikawa_3', name: 'Chiikawa 3', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/bbc946f9-3569-42f6-b3b0-3287169a05e2', thumbnailVideo: './themes/live/thumbs/chiikawa-3.mp4', isLight: true, textColor: '#0F172A', accentColor: '#64748b', glassColor: 'rgba(227,228,228,0.50)', menuBg: 'rgba(237,238,238,0.84)' },
  { id: 'live:chiikawa_4', name: 'Chiikawa 4', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/c19eb592-d2b4-4205-8772-567dc11b66da', thumbnailVideo: './themes/live/thumbs/chiikawa-4.mp4', isLight: true, textColor: '#0F172A', accentColor: '#0d9488', glassColor: 'rgba(183,222,223,0.50)', menuBg: 'rgba(193,232,233,0.84)' },
  { id: 'live:chiikawa_5', name: 'Chiikawa 5', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/f3c10d6c-d085-490d-80d5-57103c1aaa15', thumbnailVideo: './themes/live/thumbs/chiikawa-5.mp4', isLight: false, textColor: '#FFFFFF', accentColor: '#a3e635', glassColor: 'rgba(27,36,10,0.60)', menuBg: 'rgba(37,46,20,0.80)' },
  { id: 'live:chiikawa_6', name: 'Chiikawa 6', category: 'live', isVideo: true, video: 'https://github.com/user-attachments/assets/02c21fd2-0c9f-4b16-af61-09f8505f50bf', thumbnailVideo: './themes/live/thumbs/chiikawa-6.mp4', isLight: true, textColor: '#0F172A', accentColor: '#65a30d', glassColor: 'rgba(212,244,151,0.50)', menuBg: 'rgba(222,254,161,0.84)' },
  // ── Moon ──
  // starry_moon: deep night sky with bright stars → indigo-blue accent, dark navy glass
  { id: 'img:moon/starry_moon',  name: 'Yıldızlı Gece',   category: 'moon', image: './themes/moon/starry_moon.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#818cf8', glassColor: 'rgba(10,8,32,0.62)',    menuBg: 'rgba(14,12,46,0.80)' },
  // moonlit_sea: moonlight reflecting on ocean → soft cyan-blue accent, deep sea glass
  { id: 'img:moon/moonlit_sea',  name: 'Ay Işığı Deniz',   category: 'moon', image: './themes/moon/moonlit_sea.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#67e8f9', glassColor: 'rgba(4,14,32,0.60)',    menuBg: 'rgba(6,20,44,0.80)' },
  // moon_rabbit: purple-tinted fantasy moon scene → lavender-purple accent
  { id: 'img:moon/moon_rabbit',  name: 'Ay Tavşanı',       category: 'moon', image: './themes/moon/moon_rabbit.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#d8b4fe', glassColor: 'rgba(20,10,40,0.60)',   menuBg: 'rgba(28,14,54,0.80)' },

  // ── Pattern ──
  // cloud_dreams: pastel blue-white clouds → soft periwinkle accent
  { id: 'img:pattern/cloud_dreams', name: 'Bulut Rüyası',    category: 'pattern', image: './themes/pattern/cloud_dreams.jpg', isLight: true,  textColor: '#0F172A', accentColor: '#818cf8', glassColor: 'rgba(220,225,248,0.52)', menuBg: 'rgba(228,232,252,0.85)' },
  // cow_print: black-white pattern → warm stone/brown accent
  { id: 'img:pattern/cow_print',   name: 'İnek Deseni',      category: 'pattern', image: './themes/pattern/cow_print.jpg',   isLight: true,  textColor: '#0F172A', accentColor: '#a8a29e', glassColor: 'rgba(242,240,236,0.52)', menuBg: 'rgba(246,244,240,0.86)' },
  // moo_face: pink/cute cow face illustration → rosy pink accent
  { id: 'img:pattern/moo_face',    name: 'Moo Yüz',          category: 'pattern', image: './themes/pattern/moo_face.jpg',    isLight: true,  textColor: '#0F172A', accentColor: '#fb7185', glassColor: 'rgba(255,235,242,0.50)', menuBg: 'rgba(254,240,246,0.84)' },
  // ocean_floor: deep blue underwater → vivid teal accent
  { id: 'img:pattern/ocean_floor', name: 'Okyanus Dibi',     category: 'pattern', image: './themes/pattern/ocean_floor.jpg', isLight: false, textColor: '#FFFFFF', accentColor: '#2dd4bf', glassColor: 'rgba(2,16,34,0.60)',    menuBg: 'rgba(4,22,46,0.80)' },

  // ── Nature ──
  // emerald_water: vivid green water → emerald green accent
  { id: 'img:nature/emerald_water',  name: 'Zümrüt Su',        category: 'nature', image: './themes/nature/emerald_water.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#34d399', glassColor: 'rgba(2,24,16,0.60)',    menuBg: 'rgba(4,32,22,0.80)' },
  // autumn_glass: warm orange/amber autumn leaves → warm amber accent
  { id: 'img:nature/autumn_glass',   name: 'Sonbahar Camı',     category: 'nature', image: './themes/nature/autumn_glass.jpg',   isLight: false, textColor: '#FFFFFF', accentColor: '#f59e0b', glassColor: 'rgba(36,18,4,0.60)',    menuBg: 'rgba(48,26,6,0.80)' },
  // daisy_field: bright sunny daisy meadow → golden yellow accent
  { id: 'img:nature/daisy_field',    name: 'Papatya Tarlası',   category: 'nature', image: './themes/nature/daisy_field.jpg',    isLight: true,  textColor: '#0F172A', accentColor: '#eab308', glassColor: 'rgba(250,246,225,0.50)', menuBg: 'rgba(252,250,232,0.84)' },
  // fruit_tree: red/pink fruit on green tree → warm red-coral accent
  { id: 'img:nature/fruit_tree',     name: 'Meyve Ağacı',       category: 'nature', image: './themes/nature/fruit_tree.jpg',     isLight: true,  textColor: '#0F172A', accentColor: '#f43f5e', glassColor: 'rgba(248,236,232,0.50)', menuBg: 'rgba(252,242,238,0.84)' },
  // green_journey: lush green path/forest → forest green accent
  { id: 'img:nature/green_journey',  name: 'Yeşil Yolculuk',    category: 'nature', image: './themes/nature/green_journey.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#22c55e', glassColor: 'rgba(4,22,8,0.60)',     menuBg: 'rgba(6,30,12,0.80)' },
  // meadow_breeze: light green open meadow → mint green accent
  { id: 'img:nature/meadow_breeze',  name: 'Çayır Esintisi',    category: 'nature', image: './themes/nature/meadow_breeze.jpg',  isLight: true,  textColor: '#0F172A', accentColor: '#4ade80', glassColor: 'rgba(232,248,232,0.50)', menuBg: 'rgba(236,252,238,0.84)' },
  // sparkling_lake: blue lake with sparkles → bright sky blue accent
  { id: 'img:nature/sparkling_lake', name: 'Pırıl Göl',        category: 'nature', image: './themes/nature/sparkling_lake.jpg', isLight: false, textColor: '#FFFFFF', accentColor: '#0ea5e9', glassColor: 'rgba(2,12,28,0.60)',    menuBg: 'rgba(4,18,42,0.80)' },

  // ── Cats ──
  // space_cat: cat in cosmic purple nebula → neon purple accent
  { id: 'img:cats/space_cat',    name: 'Uzay Kedisi',      category: 'cats', image: './themes/cats/space_cat.jpg',    isLight: false, textColor: '#FFFFFF', accentColor: '#c084fc', glassColor: 'rgba(14,4,30,0.60)',    menuBg: 'rgba(20,8,44,0.80)' },
  // moonlit_cat: cat silhouette against blue moon → steel blue accent
  { id: 'img:cats/moonlit_cat',  name: 'Ay Kedisi',        category: 'cats', image: './themes/cats/moonlit_cat.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#60a5fa', glassColor: 'rgba(8,10,30,0.60)',    menuBg: 'rgba(12,16,44,0.80)' },
  // cozy_kitten: warm soft orange/beige kitten → warm peach accent
  { id: 'img:cats/cozy_kitten',  name: 'Minik Kedi',       category: 'cats', image: './themes/cats/cozy_kitten.jpg',  isLight: true,  textColor: '#0F172A', accentColor: '#f97316', glassColor: 'rgba(252,240,226,0.50)', menuBg: 'rgba(255,244,232,0.86)' },
  // doodle_cats: pink/pastel drawn cats → candy pink accent
  { id: 'img:cats/doodle_cats',  name: 'Çizgi Kediler',    category: 'cats', image: './themes/cats/doodle_cats.jpg',  isLight: true,  textColor: '#0F172A', accentColor: '#ec4899', glassColor: 'rgba(255,236,245,0.50)', menuBg: 'rgba(255,240,248,0.84)' },
  // sky_cats: cats floating in blue sky → sky blue accent
  { id: 'img:cats/sky_cats',     name: 'Gökyüzü Kedisi',   category: 'cats', image: './themes/cats/sky_cats.jpg',     isLight: true,  textColor: '#0F172A', accentColor: '#38bdf8', glassColor: 'rgba(226,238,255,0.50)', menuBg: 'rgba(232,244,255,0.84)' },
  // sleepy_cats: soft lavender sleeping cats → soft violet accent
  { id: 'img:cats/sleepy_cats',  name: 'Uykucu Kedi',      category: 'cats', image: './themes/cats/sleepy_cats.jpg',  isLight: true,  textColor: '#0F172A', accentColor: '#a78bfa', glassColor: 'rgba(240,234,255,0.50)', menuBg: 'rgba(244,238,255,0.84)' },
  // carpet_cats: dark carpet with cats → warm rose accent
  { id: 'img:cats/carpet_cats',  name: 'Halı Kedisi',      category: 'cats', image: './themes/cats/carpet_cats.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#fb7185', glassColor: 'rgba(20,10,22,0.60)',   menuBg: 'rgba(28,14,30,0.80)' },
  // subway_cat: city/metro warm tones → warm amber/yellow accent
  { id: 'img:cats/subway_cat',   name: 'Metro Kedisi',     category: 'cats', image: './themes/cats/subway_cat.jpg',   isLight: false, textColor: '#FFFFFF', accentColor: '#f59e0b', glassColor: 'rgba(16,14,20,0.60)',   menuBg: 'rgba(24,20,28,0.80)' },
  // surf_cat: ocean/teal surfing cat → ocean teal accent
  { id: 'img:cats/surf_cat',     name: 'Sörfçü Kedi',      category: 'cats', image: './themes/cats/surf_cat.jpg',     isLight: false, textColor: '#FFFFFF', accentColor: '#14b8a6', glassColor: 'rgba(2,16,24,0.60)',    menuBg: 'rgba(4,22,34,0.80)' },

  // ── Frames ──
  // starry_frame: starry night artistic frame → golden star accent
  { id: 'img:frames/starry_frame',  name: 'Yıldız Çerçeve',  category: 'frames', image: './themes/frames/starry_frame.jpg',  isLight: false, textColor: '#FFFFFF', accentColor: '#fbbf24', glassColor: 'rgba(14,10,30,0.60)',   menuBg: 'rgba(20,14,44,0.80)' },
  // lighthouse: warm sunset lighthouse → warm orange accent
  { id: 'img:frames/lighthouse',    name: 'Deniz Feneri',     category: 'frames', image: './themes/frames/lighthouse.jpg',    isLight: false, textColor: '#FFFFFF', accentColor: '#fb923c', glassColor: 'rgba(12,10,24,0.60)',   menuBg: 'rgba(18,14,34,0.80)' },
  // love_letter: pink/cream romantic → romantic rose accent
  { id: 'img:frames/love_letter',   name: 'Aşk Mektubu',     category: 'frames', image: './themes/frames/love_letter.jpg',   isLight: true,  textColor: '#0F172A', accentColor: '#e11d48', glassColor: 'rgba(255,232,238,0.50)', menuBg: 'rgba(255,236,242,0.86)' },
  // notebook: paper/beige toned → warm brown accent
  { id: 'img:frames/notebook',      name: 'Not Defteri',      category: 'frames', image: './themes/frames/notebook.jpg',      isLight: true,  textColor: '#0F172A', accentColor: '#92400e', glassColor: 'rgba(248,244,236,0.50)', menuBg: 'rgba(250,248,240,0.86)' },
  // tidal_waves: dramatic ocean waves → deep ocean blue accent
  { id: 'img:frames/tidal_waves',   name: 'Gel-Git Dalgası',  category: 'frames', image: './themes/frames/tidal_waves.jpg',   isLight: false, textColor: '#FFFFFF', accentColor: '#0284c7', glassColor: 'rgba(2,8,28,0.60)',     menuBg: 'rgba(4,12,38,0.80)' },
];

// ── Unified Theme Resolution ──

export interface ResolvedTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  isLight: boolean;
  isImage: boolean;
  isVideo?: boolean;
  image?: string;
  video?: string;
  thumbnailVideo?: string;
  glassColor: string;
  textColor: string;
  menuBg: string;
}

export function getTheme(id: string): ResolvedTheme {
  // Check image themes first
  const imgTheme = IMAGE_THEMES.find(t => t.id === id);
  if (imgTheme) {
    return {
      id: imgTheme.id,
      name: imgTheme.name,
      bg: 'transparent',
      text: imgTheme.textColor,
      accent: imgTheme.accentColor,
      isLight: imgTheme.isLight,
      isImage: true,
      isVideo: imgTheme.isVideo,
      image: imgTheme.image && isElectron ? imgTheme.image.replace('./themes/', './themes_4k/') : imgTheme.image,
      video: imgTheme.video,
      thumbnailVideo: imgTheme.thumbnailVideo,
      glassColor: imgTheme.glassColor,
      textColor: imgTheme.textColor,
      menuBg: imgTheme.menuBg,
    };
  }

  // Fallback to color themes
  const colorTheme = COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];
  return {
    id: colorTheme.id,
    name: colorTheme.name,
    bg: colorTheme.bg,
    text: colorTheme.text,
    accent: colorTheme.accent,
    isLight: false,
    isImage: false,
    glassColor: 'rgba(10,10,30,0.55)',
    textColor: colorTheme.text,
    menuBg: `${colorTheme.bg}cc`,
  };
}

// ── Avatar Color Helper ──
const AVATAR_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #f6d365, #fda085)',
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Layout Mode ──
export type RoomMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape';
