// ═══════════════════════════════════════════════════════════════
// Access Code Page — Invite-Only Lock Screen
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../stores';
import { connectSocket, warmUpServer } from '../services/socket';

export default function AccessCodePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Lütfen bir davetiye kodu girin');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    // Save the access code
    useAuthStore.getState().setAccessCode(code.trim());

    // Ensure username exists
    const username = useAuthStore.getState().username;
    if (!username) {
      useUIStore.getState().setView('home');
      setLoading(false);
      return;
    }

    // Warm up server + connect socket with event-based result detection
    try {
      await warmUpServer();
      const newSocket = connectSocket(username);

      // Wait for either connect success or connect_error
      const result = await new Promise<'ok' | string>((resolve) => {
        const timeout = setTimeout(() => resolve('Sunucu yanıt vermedi'), 15000);

        newSocket.once('connect', () => {
          clearTimeout(timeout);
          resolve('ok');
        });

        newSocket.once('connect_error', (err: any) => {
          clearTimeout(timeout);
          resolve(err.message || 'Bağlantı hatası');
        });
      });

      if (result === 'ok') {
        useUIStore.getState().setView('home');
      } else {
        setError(result === 'INVALID_ACCESS_CODE' ? 'Geçersiz davetiye kodu' : result);
        setCode('');
        triggerShake();
      }
    } catch {
      setError('Sunucuya bağlanılamadı');
      triggerShake();
    }
    setLoading(false);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #050816 0%, #0a0f2e 40%, #0d1235 100%)',
      fontFamily: 'var(--font-family)',
      position: 'fixed', top: 0, left: 0,
    }}>
      {/* Background particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            background: `hsla(${220 + Math.random() * 40}, 80%, 70%, ${0.1 + Math.random() * 0.3})`,
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div style={{
        background: 'rgba(10, 15, 40, 0.85)',
        backdropFilter: 'none',
        borderRadius: 20,
        border: '1px solid rgba(100, 130, 255, 0.15)',
        padding: '48px 40px',
        width: 380,
        maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(80, 100, 255, 0.08)',
        animation: shake ? 'shake 0.6s ease' : undefined,
        textAlign: 'center' as const,
      }}>
        {/* Lock icon */}
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(100, 130, 255, 0.15), rgba(150, 100, 255, 0.1))',
          border: '2px solid rgba(100, 130, 255, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          🔒
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 700,
          background: 'linear-gradient(135deg, #7c8fff, #c084fc)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: '0 0 8px',
        }}>
          AniSync
        </h1>
        <p style={{
          color: 'rgba(180, 190, 230, 0.7)',
          fontSize: 13, margin: '0 0 32px',
        }}>
          Davetiye kodu ile giriş yapın
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="Davetiye kodunuzu girin..."
              /* autoFocus removed: on mobile, let the user tap to focus instead of keyboard popping immediately */
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: `1px solid ${error ? 'rgba(255,80,80,0.5)' : 'rgba(100, 130, 255, 0.2)'}`,
                background: 'rgba(5, 10, 30, 0.6)',
                color: '#e0e0ff',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                boxSizing: 'border-box' as const,
                letterSpacing: 2,
                textAlign: 'center' as const,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(100, 130, 255, 0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(100, 130, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? 'rgba(255,80,80,0.5)' : 'rgba(100, 130, 255, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <p style={{
              color: '#ff6b6b', fontSize: 12, margin: '0 0 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 12,
              border: 'none',
              background: loading
                ? 'rgba(100, 130, 255, 0.3)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)',
              letterSpacing: 0.5,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as any).style.transform = 'translateY(-1px)';
                (e.target as any).style.boxShadow = '0 6px 25px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as any).style.transform = 'translateY(0)';
              (e.target as any).style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)';
            }}
          >
            {loading ? '⏳ Bağlanılıyor...' : '🚀 Giriş Yap'}
          </button>
        </form>

        <p style={{
          color: 'rgba(140, 150, 200, 0.4)',
          fontSize: 11, marginTop: 24,
        }}>
          Kodu yalnızca uygulama sahibinden alabilirsiniz
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
