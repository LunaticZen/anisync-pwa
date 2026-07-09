import React from 'react';
import { useUIStore, type Toast } from '../stores';

export default function Toasts() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`} onClick={() => removeToast(toast.id)}>
          <div>
            <div className="toast__title">{toast.title}</div>
            {toast.message && <div className="toast__message">{toast.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
