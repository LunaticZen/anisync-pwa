import React from 'react';
import { useUIStore, type Toast } from '../stores';

export default function Toasts() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`} onClick={() => {
          if (!toast.onReject && toast.onClick) toast.onClick();
          removeToast(toast.id);
        }} style={{ cursor: (!toast.onReject && toast.onClick) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {toast.imageUrl && (
            <img src={toast.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="toast__title">{toast.title}</div>
            {toast.message && <div className="toast__message" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.message}</div>}
          </div>
          {toast.onReject ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); if(toast.onClick) toast.onClick(); removeToast(toast.id); }} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(34,197,94,0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Onayla">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); toast.onReject!(); removeToast(toast.id); }} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Reddet">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : toast.actionLabel ? (
            <button style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#fff', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
