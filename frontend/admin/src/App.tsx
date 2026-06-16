import { useState, useEffect } from 'react';
import { createTranslator, DEFAULT_LANGUAGE, LanguageCode, languages, SchatApiClient, SchatWsClient } from 'shared';
import Login from './components/Login';
import UsersPanel from './components/UsersPanel';
import BansPanel from './components/BansPanel';
import ConversationsPanel from './components/ConversationsPanel';
import GeoIpPanel from './components/GeoIpPanel';

export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

export default function App() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [activePanel, setActivePanel] = useState<'chat' | 'users' | 'bans' | 'geoip'>('chat');
  const [apiClient, setApiClient] = useState<SchatApiClient | null>(null);
  const [wsClient, setWsClient] = useState<SchatWsClient | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const t = createTranslator(language);

  // Initialize API Client on startup
  useEffect(() => {
    const api = new SchatApiClient({
      baseURL: '',
      onLogout: () => {
        handleLogoutLocal();
      },
      onTokenRefreshed: (access) => {
        if (wsClient) {
          wsClient.connect(access);
        }
      }
    });

    const ws = new SchatWsClient({
      url: window.location.origin
    });

    setApiClient(api);
    setWsClient(ws);

    return () => {
      ws.disconnect();
    };
  }, []);

  const handleLogoutLocal = () => {
    setUser(null);
    if (wsClient) {
      wsClient.disconnect();
    }
  };

  const handleLogin = async (username: string, password: string) => {
    if (!apiClient || !wsClient) return;
    setLoginError(null);

    try {
      const data = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { username, password });

      apiClient.setTokens(data.accessToken, data.refreshToken);

      // Fetch profile identity
      const profile = await apiClient.get<UserIdentity>('/auth/me');
      if (profile.role === 'USER') {
        throw new Error(t('admin.login.denied'));
      }

      setUser(profile);
      wsClient.connect(data.accessToken);
    } catch (err: any) {
      console.error(err);
      setLoginError(err.response?.data?.message || err.message || t('admin.login.failed'));
    }
  };

  const handleLogout = async () => {
    if (!apiClient) return;
    try {
      const rfToken = apiClient.getRefreshToken();
      if (rfToken) {
        await apiClient.post('/auth/logout', { refreshToken: rfToken });
      }
    } catch (e) {
      console.error(e);
    } finally {
      apiClient.setTokens(null, null);
      handleLogoutLocal();
    }
  };

  if (!apiClient || !wsClient) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="typing-indicator">
          <span>{t('admin.loading')}</span>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        error={loginError}
        t={t}
        language={language}
        onLanguageChange={setLanguage}
      />
    );
  }

  const headerTitle = {
    chat: t('admin.header.chat'),
    users: t('admin.header.users'),
    bans: t('admin.header.bans'),
    geoip: t('admin.header.geoip')
  }[activePanel];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div>
          <div className="sidebar-brand text-gradient-cyan">
            <span style={{ fontSize: '1.8rem' }}>⚙️</span> {t('admin.brand')}
          </div>
          <ul className="sidebar-menu">
            <li
              className={`menu-item ${activePanel === 'chat' ? 'active' : ''}`}
              onClick={() => setActivePanel('chat')}
            >
              💬 {t('admin.nav.chats')}
            </li>
            <li
              className={`menu-item ${activePanel === 'users' ? 'active' : ''}`}
              onClick={() => setActivePanel('users')}
            >
              👥 {t('admin.nav.users')}
            </li>
            <li
              className={`menu-item ${activePanel === 'bans' ? 'active' : ''}`}
              onClick={() => setActivePanel('bans')}
            >
              🚫 {t('admin.nav.bans')}
            </li>
            <li
              className={`menu-item ${activePanel === 'geoip' ? 'active' : ''}`}
              onClick={() => setActivePanel('geoip')}
            >
              🌍 {t('admin.nav.geoip')}
            </li>
          </ul>
        </div>

        <div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role}</div>
          </div>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="input-label">{t('common.language')}</label>
            <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
              {languages.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            🚪 {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header glass-panel">
          <div>
            <h2 className="text-gradient-purple" style={{ textTransform: 'capitalize' }}>
              {headerTitle}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="badge badge-success">{t('common.online')}</span>
            <span className="badge badge-primary">{user.role}</span>
          </div>
        </header>

        <section className="panel-container">
          {activePanel === 'chat' && (
            <ConversationsPanel apiClient={apiClient} wsClient={wsClient} currentUser={user} t={t} />
          )}
          {activePanel === 'users' && (
            <UsersPanel apiClient={apiClient} currentUser={user} t={t} />
          )}
          {activePanel === 'bans' && (
            <BansPanel apiClient={apiClient} t={t} />
          )}
          {activePanel === 'geoip' && (
            <GeoIpPanel apiClient={apiClient} t={t} />
          )}
        </section>
      </main>
    </div>
  );
}
