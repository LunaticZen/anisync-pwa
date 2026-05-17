// ═══════════════════════════════════════════════════════════════
// Register Page — User Registration
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '../stores';
import { connectSocket } from '../services/socket';

const API_URL = 'http://localhost:3000/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isLoading, error, setAuth, setLoading, setError } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, displayName: displayName || username }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? 'Kayıt başarısız');
        return;
      }

      setAuth(data.data.user, data.data.tokens);
      connectSocket();
      useUIStore.getState().setView('lobby');
      useUIStore.getState().addToast({ type: 'success', title: 'Hoş geldin!', message: 'Hesabın oluşturuldu' });
    } catch {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Kayıt Ol</h1>
        <p className="auth-card__subtitle">AniSync'e katıl, birlikte izle</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı</label>
            <input id="reg-username" className="form-input" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder="kullanici_adi"
              autoFocus autoComplete="username" maxLength={20} />
          </div>

          <div className="form-group">
            <label className="form-label">Görünen Ad</label>
            <input id="reg-display" className="form-input" type="text" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} placeholder="Görünen adınız"
              maxLength={50} />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="reg-email" className="form-input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="email@ornek.com"
              autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input id="reg-password" className="form-input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter"
              autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre Tekrar</label>
            <input id="reg-confirm" className="form-input" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Şifrenizi tekrarlayın"
              autoComplete="new-password" />
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button id="reg-submit" className="btn btn--primary btn--full btn--lg" type="submit" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : 'Hesap Oluştur'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
          Zaten hesabın var mı?{' '}
          <span className="link" onClick={() => useUIStore.getState().setView('login')}>
            Giriş Yap
          </span>
        </p>
      </div>
    </div>
  );
}
