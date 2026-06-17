import { useEffect, useState } from 'react';
import { createTranslator, DEFAULT_LANGUAGE, LanguageCode, languages, SchatApiClient, SchatWsClient } from 'shared';
import Login from './components/Login';
import ChatWindow from './components/ChatWindow';
import { deleteWebPushSubscription, registerWebPush } from './push';

export type UserIdentity = {
  id: string;
  username: string;
  role: 'MASTER' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  permissions: string[];
};

type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  members: { id: string; userId: string; conversationId: string }[];
};

export default function App() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [apiClient, setApiClient] = useState<SchatApiClient | null>(null);
  const [wsClient, setWsClient] = useState<SchatWsClient | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [usersList, setUsersList] = useState<{ [userId: string]: string }>({});
  const [webPushSubscriptionId, setWebPushSubscriptionId] = useState<string | null>(null);
  const t = createTranslator(language);

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
    setConversations([]);
    setActiveConv(null);
    setWebPushSubscriptionId(null);
    if (wsClient) {
      wsClient.disconnect();
    }
  };

  const handleLogin = async (username: string, password: string) => {
    if (!apiClient || !wsClient) return;
    setLoginError(null);

    try {
      const data = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/login', { username, password });
      apiClient.setTokens(data.accessToken, data.refreshToken);

      const profile = await apiClient.get<UserIdentity>('/auth/me');
      if (profile.status === 'DISABLED') {
        throw new Error(t('user.login.disabled'));
      }

      setUser(profile);
      wsClient.connect(data.accessToken);

      wsClient.onUserBanned((banData: { userId?: string }) => {
        if (banData.userId === profile.id) {
          alert(t('user.banned'));
          handleLogoutLocal();
        }
      });

      const convList = await apiClient.get<Conversation[]>('/user/conversations');
      setConversations(convList);

      try {
        const users = await apiClient.get<{ id: string; username: string }[]>('/admin/users');
        const mapping: { [userId: string]: string } = {};
        users.forEach(u => {
          mapping[u.id] = u.username;
        });
        setUsersList(mapping);
      } catch (e) {
        console.log('Skipping users query (restricted role)');
        mappingFallback(convList, profile);
      }

      registerWebPush(apiClient)
        .then(setWebPushSubscriptionId)
        .catch((error) => console.info('Web Push registration skipped', error));
    } catch (err: any) {
      console.error(err);
      setLoginError(err.response?.data?.message || err.message || t('user.login.failed'));
    }
  };

  const mappingFallback = (convs: Conversation[], self: UserIdentity) => {
    const mapping: { [userId: string]: string } = { [self.id]: self.username };
    convs.forEach(c => {
      c.members.forEach(m => {
        if (!mapping[m.userId]) {
          mapping[m.userId] = `${t('common.user')} (${m.userId.substring(0, 5)})`;
        }
      });
    });
    setUsersList(mapping);
  };

  const handleLogout = async () => {
    if (!apiClient) return;
    try {
      const rfToken = apiClient.getRefreshToken();
      await deleteWebPushSubscription(apiClient, webPushSubscriptionId);
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

  const handleSelectConv = (conv: Conversation) => {
    if (activeConv) {
      wsClient?.leaveConversation(activeConv.id);
    }
    setActiveConv(conv);
    wsClient?.joinConversation(conv.id);
  };

  if (!apiClient || !wsClient) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('user.loading')}</div>
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

  return (
    <div className="app-wrapper">
      <aside className="sidebar-panel glass-panel">
        <div>
          <h2 className="text-gradient-cyan" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
            {t('user.brand')}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('user.environment')}</span>

          <ul className="room-list">
            {conversations.map(c => {
              const membersText = c.members
                .map(m => usersList[m.userId] || m.userId.substring(0, 5))
                .join(', ');

              return (
                <li key={c.id} className={`room-card ${activeConv?.id === c.id ? 'active' : ''}`} onClick={() => handleSelectConv(c)}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                    {c.title || t('user.roomFallback')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {membersText}
                  </div>
                </li>
              );
            })}
            {conversations.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>
                {t('user.noRooms')}
              </div>
            )}
          </ul>
        </div>

        <div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('user.identityId')}: {user.id.substring(0, 8)}</div>
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
            {t('user.exit')}
          </button>
        </div>
      </aside>

      <main className="chat-panel">
        {activeConv ? (
          <ChatWindow
            apiClient={apiClient}
            wsClient={wsClient}
            activeConv={activeConv}
            currentUser={user}
            usersList={usersList}
            t={t}
          />
        ) : (
          <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            {t('user.selectRoom')}
          </div>
        )}
      </main>
    </div>
  );
}
