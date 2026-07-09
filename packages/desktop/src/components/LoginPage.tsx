// ═══════════════════════════════════════════════════════════════
// Login Page — JWT Authentication
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../stores';
import { connectSocket } from '../services/socket';

const API_URL = 'http://localhost:3000/api';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isLoading, error, setAuth, setLoading, setError } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? 'Giriş başarısız');
        return;
      }

      setAuth(data.data.user, data.data.tokens);
      connectSocket();
      useUIStore.getState().setView('lobby');
    } catch (err) {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">AniSync</h1>
        <p className="auth-card__subtitle">Anime birlikte izleme platformu</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı veya Email</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="kullanici_adi"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button id="login-submit" className="btn btn--primary btn--full btn--lg" type="submit" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
          Hesabın yok mu?{' '}
          <span className="link" onClick={() => useUIStore.getState().setView('register')}>
            Kayıt Ol
          </span>
        </p>
      </div>
    </div>
  );
}
