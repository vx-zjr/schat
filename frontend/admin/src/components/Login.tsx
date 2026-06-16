import React, { useState } from 'react';
import { I18nKey, LanguageCode, languages } from 'shared';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  error: string | null;
  t: (key: I18nKey) => string;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
}

export default function Login({ onLogin, error, t, language, onLanguageChange }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      onLogin(username.trim(), password);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #03001e 100%)'
    }}>
      <div className="glass-panel" style={{
        width: '400px',
        padding: '40px',
        boxShadow: '0 0 50px rgba(99, 102, 241, 0.2)',
        textAlign: 'center'
      }}>
        <h1 className="text-gradient-cyan" style={{ fontSize: '2rem', marginBottom: '8px' }}>schat</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
          {t('admin.login.subtitle')}
        </p>

        <div className="input-group" style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label className="input-label">{t('common.language')}</label>
          <select className="input-field" value={language} onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}>
            {languages.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="input-group">
            <label className="input-label">{t('common.username')}</label>
            <input
              type="text"
              className="input-field"
              placeholder={t('admin.login.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">{t('common.password')}</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            {t('admin.login.submit')}
          </button>
        </form>

        <p style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem', marginTop: '32px' }}>
          {t('admin.login.memory')}
        </p>
      </div>
    </div>
  );
}
