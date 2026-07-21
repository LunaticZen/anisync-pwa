import React from 'react';
import { useUIStore, type Toast } from '../stores';

export default function Toasts() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`} onClick={() => {
          if (toast.onClick) toast.onClick();
          removeToast(toast.id);
        }} style={{ cursor: toast.onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="toast__title">{toast.title}</div>
            {toast.message && <div className="toast__message">{toast.message}</div>}
          </div>
          {toast.actionLabel && (
            <button style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#fff', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
