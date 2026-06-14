import { useEffect, useRef } from 'react';
import emojiData from './emojis.json';

interface EmojiPickerProps {
  onSelect: (emojiTag: string) => void;
  onClose: () => void;
  isLight: boolean;
  isImage: boolean;
}

export function EmojiPicker({ onSelect, onClose, isLight, isImage }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: 0,
        width: 320,
        height: 400,
        background: bg,
        backdropFilter: isImage ? 'blur(16px)' : 'none',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'emojiPickerScaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        transformOrigin: 'bottom left',
        zIndex: 100
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
          background: ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'};
          z-index: 2;
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${borderColor}`,
        fontWeight: 600,
        fontSize: 14,
        color: textColor,
        flexShrink: 0
      }}>
        Özel Emojiler
      </div>

      {/* Scrollable Content */}
      <div 
        className="emoji-picker-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px 8px 8px',
          position: 'relative'
        }}
      >
        {emojiData.map((category) => (
          <div key={category.name} style={{ marginBottom: 12 }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: headerBg,
              backdropFilter: isImage ? 'blur(8px)' : 'none',
              padding: '8px 8px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: headerColor,
              zIndex: 1,
              borderRadius: '0 0 4px 4px'
            }}>
              {category.name}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              padding: '4px'
            }}>
              {category.emojis.map((emoji) => (
                <div
                  key={emoji.path}
                  className="emoji-item"
                  onClick={() => {
                    onSelect(`[emoji:${emoji.path}]`);
                    // optionally close on select, but Discord keeps it open. We'll keep it open
                  }}
                  title={emoji.name}
                  style={{
                    aspectRatio: '1/1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <img 
                    src={`/emojis/${emoji.path}`} 
                    alt={emoji.name}
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
  );
}
