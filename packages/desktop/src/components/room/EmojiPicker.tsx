import { useState, useEffect, useRef } from 'react';
import emojiData from './emojis.json';

interface EmojiPickerProps {
  onSelect: (emojiTag: string) => void;
  onClose: () => void;
  isLight: boolean;
  isImage: boolean;
  isKeyboardOpen?: boolean;
}

export function EmojiPicker({ onSelect, onClose, isLight, isImage, isKeyboardOpen }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const bg = isLight 
    ? (isImage ? 'rgba(255, 255, 255, 0.85)' : '#ffffff') 
    : (isImage ? 'rgba(15, 23, 42, 0.85)' : '#1e293b');
  
  const headerBg = isLight
    ? (isImage ? 'rgba(255, 255, 255, 0.95)' : '#ffffff')
    : (isImage ? 'rgba(15, 23, 42, 0.95)' : '#1e293b');

  const textColor = isLight ? '#1e293b' : '#f8fafc';
  const headerColor = isLight ? '#64748b' : '#94a3b8';
  const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  const filteredCategories = emojiData.map(cat => ({
    ...cat,
    emojis: cat.emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.emojis.length > 0);

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 10px)',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div
        ref={containerRef}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          width: 290,
          maxWidth: 'calc(100% - 16px)',
          height: 400,
          maxHeight: 'min(400px, calc(100cqh - 60px))',
          background: bg,
          backdropFilter: 'none',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modernMenuPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          transformOrigin: 'bottom center',
        }}
      >
        <style>{`
          @keyframes emojiPickerScaleIn {
            from { opacity: 0; transform: scale(0.9) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .emoji-picker-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .emoji-picker-scroll::-webkit-scrollbar-thumb {
            background: ${borderColor};
            border-radius: 4px;
          }
          .emoji-item {
            transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
            border-radius: 8px;
          }
          .emoji-item:hover {
            transform: scale(1.3);
          }
        `}</style>
        
        {/* Search header */}
        <div style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${borderColor}`,
          background: headerBg,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={headerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            type="text"
            placeholder="Emoji ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: textColor,
              padding: 0
            }}
          />
        </div>

        {/* Scrollable Emoji Categories */}
        <div 
          className="emoji-picker-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 8px 8px 8px'
          }}
        >
          {filteredCategories.map((cat, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{
                position: 'sticky',
                top: 0,
                background: headerBg,
                padding: '8px 4px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: headerColor,
                zIndex: 1
              }}>
                {cat.name}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 6
              }}>
                {cat.emojis.map((emoji, i) => (
                  <div
                    key={i}
                    className="emoji-item"
                    onClick={() => {
                      onSelect(`[emoji:${emoji.path}]`);
                      onClose();
                    }}
                    style={{
                      aspectRatio: '1/1',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img 
                      src={emoji.path.startsWith('http') ? emoji.path : `https://cdn.jsdelivr.net/gh/LunaticZen/live_wallpapers@main/emojis/${emoji.path}`}
                      alt={emoji.name}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
