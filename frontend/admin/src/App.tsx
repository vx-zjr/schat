import { useEffect, useRef, useState } from 'react';
import {
  applyTheme,
  createTranslator,
  readLanguage,
  readTheme,
  SchatApiClient,
  SchatWsClient,
  writeLanguage,
  writeTheme,
  type LanguageCode,
  type ThemeMode
} from 'shared';
import Login from './components/Login';
import UsersPanel from './components/UsersPanel';
import BansPanel from './components/BansPanel';
import ConversationsPanel from './components/ConversationsPanel';
import GeoIpPanel from './components/GeoIpPanel';
import AdminShell from './layout/AdminShell';
import type { AdminPanel } from './types';

export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

export default function App() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [activePanel, setActivePanel] = useState<AdminPanel>('chat');
  const [apiClient, setApiClient] = useState<SchatApiClient | null>(null);
  const [wsClient, setWsClient] = useState<SchatWsClient | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(() => readLanguage(window.localStorage));
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme(
    window.localStorage,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ));
  const wsClientRef = useRef<SchatWsClient | null>(null);
  const t = createTranslator(language);

  const handleLogoutLocal = () => {
    setUser(null);
    wsClientRef.current?.disconnect();
  };

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  useEffect(() => {
    const ws = new SchatWsClient({ url: window.location.origin });
    const api = new SchatApiClient({
      baseURL: '',
      onLogout: handleLogoutLocal,
      onTokenRefreshed: (access) => wsClientRef.current?.connect(access)
    });

    wsClientRef.current = ws;
    setApiClient(api);
    setWsClient(ws);

    return () => {
      ws.disconnect();
      wsClientRef.current = null;
    };
  }, []);

  const handleLanguageChange = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    writeLanguage(window.localStorage, nextLanguage);
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    writeTheme(window.localStorage, nextTheme);
  };

  const handleLogin = async (username: string, password: string) => {
    if (!apiClient || !wsClient) return;
    setLoginError(null);

    try {
      const data = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/login', { username, password });
      apiClient.setTokens(data.accessToken, data.refreshToken);

      const profile = await apiClient.get<UserIdentity>('/auth/me');
      if (profile.role === 'USER' && profile.permissions.length === 0) {
        apiClient.setTokens(null, null);
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
      const refreshToken = apiClient.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error(error);
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
    return <Login onLogin={handleLogin} error={loginError} t={t} language={language} onLanguageChange={handleLanguageChange} />;
  }

  const headerTitle = {
    chat: t('admin.header.chat'),
    users: t('admin.header.users'),
    bans: t('admin.header.bans'),
    geoip: t('admin.header.geoip')
  }[activePanel];

  return (
    <AdminShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      username={user.username}
      role={user.role}
      language={language}
      onLanguageChange={handleLanguageChange}
      theme={theme}
      onThemeChange={handleThemeChange}
      onLogout={handleLogout}
      headerTitle={headerTitle}
      t={t}
    >
      {activePanel === 'chat' && <ConversationsPanel apiClient={apiClient} wsClient={wsClient} currentUser={user} t={t} />}
      {activePanel === 'users' && <UsersPanel apiClient={apiClient} currentUser={user} t={t} />}
      {activePanel === 'bans' && <BansPanel apiClient={apiClient} t={t} />}
      {activePanel === 'geoip' && <GeoIpPanel apiClient={apiClient} t={t} />}
    </AdminShell>
  );
}
