import React, { useState, useEffect, useRef } from 'react';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
  activeTheme: any;
}

const DEFAULT_STICKERS = [
  "https://i.ibb.co/s9JYz5sg/5773-kuromi-wave.png"
];

// ImgBB API Key provided by user
const IMGBB_API_KEY = "7bf7ab7443109937733eb7b2287d42ad";

export function StickerPicker({ onSelect, onClose, activeTheme }: StickerPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const [favoriteStickers, setFavoriteStickers] = useState<string[]>([]);
  
  // Custom Sticker Cropper States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load stickers from localStorage
  const loadStickers = () => {
    try {
      const custom = localStorage.getItem('anisync_custom_stickers');
      if (custom) setCustomStickers(JSON.parse(custom));
      const favs = localStorage.getItem('anisync_favorite_stickers');
      if (favs) setFavoriteStickers(JSON.parse(favs));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStickers();
    
    // Listen to changes in favorites from MessageOverlayMenu
    const handleFavUpdate = () => {
      loadStickers();
    };
    window.addEventListener('anisync_favorites_updated', handleFavUpdate);
    return () => window.removeEventListener('anisync_favorites_updated', handleFavUpdate);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.crop-modal-container')
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (blob: Blob) => {
    setCropImageSrc(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', blob, 'sticker.png');

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success && result.data?.url) {
        const newUrl = result.data.url;
        const updated = [...customStickers, newUrl];
        setCustomStickers(updated);
        localStorage.setItem('anisync_custom_stickers', JSON.stringify(updated));
      } else {
        alert('Sticker yüklenemedi. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      console.error(err);
      alert('Sticker yüklenirken bir hata oluştu.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isLight = activeTheme.isLight;

  const makeSolid = (rgbaStr: string) => {
    if (!rgbaStr) return '';
    return rgbaStr.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d\.]+\s*\)/, 'rgb($1, $2, $3)');
  };

  const bg = activeTheme.isImage 
    ? makeSolid(activeTheme.menuBg || activeTheme.glassColor || '#1e293b') 
    : activeTheme.bg;
  
  const headerBg = bg;
  const textColor = activeTheme.textColor || (isLight ? '#1e293b' : '#f8fafc');
  const headerColor = isLight ? '#64748b' : '#94a3b8';
  const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        right: 8,
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
        transformOrigin: 'bottom right',
        zIndex: 100
      }}
    >
      <style>{`
        .sticker-picker-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sticker-picker-scroll::-webkit-scrollbar-thumb {
          background: ${borderColor};
          border-radius: 4px;
        }
        .sticker-item {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          background: ${isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${borderColor};
        }
        .sticker-item:hover {
          transform: scale(1.1);
          background: ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'};
          z-index: 2;
        }
        .create-sticker-btn {
          aspect-ratio: 1/1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed ${borderColor};
          border-radius: 8px;
          cursor: pointer;
          color: ${headerColor};
          font-size: 11px;
          font-weight: 500;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .create-sticker-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${borderColor}`,
        fontWeight: 600,
        fontSize: 14,
        color: textColor,
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Çıkartmalar</span>
        {isUploading && (
          <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 500 }}>Yükleniyor...</span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Scrollable Content */}
      <div 
        className="sticker-picker-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px 8px 8px',
          position: 'relative'
        }}
      >
        {/* FAVORITES */}
        {favoriteStickers.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: headerBg,
              padding: '8px 8px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: headerColor,
              zIndex: 1,
              borderRadius: '0 0 4px 4px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Favoriler
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              padding: '4px'
            }}>
              {favoriteStickers.map((url, i) => (
                <div
                  key={i}
                  className="sticker-item"
                  onClick={() => onSelect(`[sticker:${url}]`)}
                  style={{ aspectRatio: '1/1', padding: 4 }}
                >
                  <img 
                    src={url} 
                    alt="favorite sticker" 
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM STICKERS */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            position: 'sticky',
            top: 0,
            background: headerBg,
            padding: '8px 8px',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: headerColor,
            zIndex: 1,
            borderRadius: '0 0 4px 4px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.38531 19.5267 6.07172 19.8659 6.8166 19.9587C7.4571 20.0384 8.0772 19.7423 8.35414 19.1643L9.12328 17.5583C9.36215 17.06 9.86903 16.7441 10.4226 16.7441H13.5774C14.131 16.7441 14.6378 17.06 14.8767 17.5583L15.6459 19.1643C15.9228 19.7423 16.5429 20.0384 17.1834 19.9587C17.9283 19.8659 18.6147 19.5267 19.1414 19" />
              <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
              <circle cx="12" cy="7.5" r="1" fill="currentColor"/>
              <circle cx="16.5" cy="10.5" r="1" fill="currentColor"/>
            </svg>
            Kendi Çıkartmalarım
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '4px'
          }}>
            {/* Create Button */}
            <div className="create-sticker-btn" onClick={() => fileInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Yeni Ekle</span>
            </div>

            {customStickers.map((url, i) => (
              <div
                key={i}
                className="sticker-item"
                onClick={() => onSelect(`[sticker:${url}]`)}
                style={{ aspectRatio: '1/1', padding: 4 }}
              >
                <img 
                  src={url} 
                  alt="custom sticker" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* DEFAULT STICKERS */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            position: 'sticky',
            top: 0,
            background: headerBg,
            padding: '8px 8px',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: headerColor,
            zIndex: 1,
            borderRadius: '0 0 4px 4px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            Çıkartmalar
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '4px'
          }}>
            {DEFAULT_STICKERS.map((url, i) => (
              <div
                key={i}
                className="sticker-item"
                onClick={() => onSelect(`[sticker:${url}]`)}
                style={{ aspectRatio: '1/1', padding: 4 }}
              >
                <img 
                  src={url} 
                  alt="default sticker" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropImageSrc && (
        <CropModal 
          imageSrc={cropImageSrc} 
          onCrop={handleCropSave} 
          onClose={() => {
            setCropImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          activeTheme={activeTheme}
        />
      )}
    </div>
  );
}

// ─── Embedded Crop Modal ───────────────────────────────────────
function CropModal({ imageSrc, onCrop, onClose, activeTheme }: { imageSrc: string, onCrop: (blob: Blob) => void, onClose: () => void, activeTheme?: any }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSave = () => {
    const img = imageRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vWidth = viewport.clientWidth;
    const vHeight = viewport.clientHeight;
    const scale = 256 / vWidth;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const centerX = vWidth / 2 + offset.x;
    const centerY = vHeight / 2 + offset.y;

    const elWidth = img.clientWidth;
    const elHeight = img.clientHeight;

    const w = elWidth * zoom;
    const h = elHeight * zoom;

    const x = centerX - w / 2;
    const y = centerY - h / 2;

    ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale);

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/png');
  };

  // Theme-aware colors
  const isLight = activeTheme?.isLight ?? false;
  const cardBg = isLight ? '#ffffff' : '#1e293b';
  const overlayBg = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.85)';
  const titleColor = isLight ? '#0f172a' : '#f1f5f9';
  const labelColor = isLight ? '#475569' : '#94a3b8';
  const borderCol = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  const viewportBg = isLight ? '#f1f5f9' : '#0f172a';
  const viewportBorder = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';
  const cancelBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
  const cancelColor = isLight ? '#334155' : '#cbd5e1';
  const cancelBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const accent = activeTheme?.accent || '#6366f1';

  return (
    <div className="crop-modal-container" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: overlayBg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 1100,
      padding: '8px 12px',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Spacer top — pushes card to center when space is available */}
      <div style={{ flex: '1 1 0', minHeight: 4 }} />

      <div style={{
        background: cardBg,
        borderRadius: 20,
        padding: '16px 16px 14px',
        width: '100%',
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: `1px solid ${borderCol}`,
        flexShrink: 0
      }}>
        {/* Title */}
        <div style={{
          color: titleColor,
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          Çıkartmayı Kırp
        </div>

        {/* Viewport */}
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            width: '100%',
            maxWidth: 160,
            aspectRatio: '1/1',
            overflow: 'hidden',
            position: 'relative',
            border: `2px solid ${viewportBorder}`,
            borderRadius: 14,
            cursor: 'move',
            touchAction: 'none',
            background: viewportBg,
            boxShadow: `inset 0 2px 8px rgba(0,0,0,${isLight ? '0.06' : '0.3'})`
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Preview"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
          {/* Corner crop guides */}
          <div style={{ position: 'absolute', top: 5, left: 5, width: 14, height: 14, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}`, borderRadius: '4px 0 0 0', opacity: 0.7 }} />
          <div style={{ position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}`, borderRadius: '0 4px 0 0', opacity: 0.7 }} />
          <div style={{ position: 'absolute', bottom: 5, left: 5, width: 14, height: 14, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}`, borderRadius: '0 0 0 4px', opacity: 0.7 }} />
          <div style={{ position: 'absolute', bottom: 5, right: 5, width: 14, height: 14, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}`, borderRadius: '0 0 4px 0', opacity: 0.7 }} />
        </div>

        {/* Zoom Slider */}
        <div style={{ width: '100%', marginTop: 12 }}>
          <div style={{ color: labelColor, fontSize: 11, fontWeight: 500, marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              Yakınlaştır
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: accent, height: 4 }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', width: '100%', gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 10,
              border: `1px solid ${cancelBorder}`,
              background: cancelBg,
              color: cancelColor,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${accent}44`,
              transition: 'all 0.15s ease'
            }}
          >
            Kaydet
          </button>
        </div>
      </div>

      {/* Spacer bottom */}
      <div style={{ flex: '1 1 0', minHeight: 4 }} />
    </div>
  );
}

