import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  applyTheme,
  createTranslator,
  languages,
  readLanguage,
  readTheme,
  SchatApiClient,
  SchatWsClient,
  writeLanguage,
  writeTheme,
  type LanguageCode,
  type ThemeMode
} from 'shared';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import { deleteWebPushSubscription, registerWebPush } from './push';
import type { DirectConversation, UserIdentity } from './types';

type ViewState = 'booting' | 'login' | 'initializing' | 'initialization-error' | 'chat';

type PendingSession = {
  profile: UserIdentity;
  accessToken: string;
};

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 }
};

export default function App() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [directConversation, setDirectConversation] = useState<DirectConversation | null>(null);
  const [apiClient, setApiClient] = useState<SchatApiClient | null>(null);
  const [wsClient, setWsClient] = useState<SchatWsClient | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('booting');
  const [language, setLanguage] = useState<LanguageCode>(() => readLanguage(window.localStorage));
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme(
    window.localStorage,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ));
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);
  const [webPushSubscriptionId, setWebPushSubscriptionId] = useState<string | null>(null);
  const directConversationRef = useRef<DirectConversation | null>(null);
  const apiClientRef = useRef<SchatApiClient | null>(null);
  const wsClientRef = useRef<SchatWsClient | null>(null);
  const bannedListenerCleanupRef = useRef<(() => void) | null>(null);
  const t = createTranslator(language);

  const leaveAndDisconnect = () => {
    const ws = wsClientRef.current;
    const direct = directConversationRef.current;
    bannedListenerCleanupRef.current?.();
    bannedListenerCleanupRef.current = null;
    if (direct) {
      ws?.leaveConversation(direct.id);
    }
    ws?.disconnect();
  };

  const handleLogoutLocal = () => {
    leaveAndDisconnect();
    directConversationRef.current = null;
    setUser(null);
    setDirectConversation(null);
    setPendingSession(null);
    setInitializationError(null);
    setWebPushSubscriptionId(null);
    setViewState('login');
  };

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  useEffect(() => {
    const ws = new SchatWsClient({ url: window.location.origin });
    const api = new SchatApiClient({
      baseURL: '',
      onLogout: handleLogoutLocal,
      onTokenRefreshed: (accessToken) => {
        ws.connect(accessToken);
        if (directConversationRef.current) {
          ws.joinConversation(directConversationRef.current.id);
        }
      }
    });

    apiClientRef.current = api;
    wsClientRef.current = ws;
    setApiClient(api);
    setWsClient(ws);
    setViewState('login');

    return () => {
      bannedListenerCleanupRef.current?.();
      if (directConversationRef.current) {
        ws.leaveConversation(directConversationRef.current.id);
      }
      ws.disconnect();
      apiClientRef.current = null;
      wsClientRef.current = null;
    };
  }, []);

  const initializeDirectChat = async (session: PendingSession) => {
    if (!apiClient || !wsClient) return;
    setInitializationError(null);
    setViewState('initializing');

    try {
      const direct = await apiClient.get<DirectConversation>('/user/direct-conversation');
      directConversationRef.current = direct;
      setUser(session.profile);
      setDirectConversation(direct);
      wsClient.connect(session.accessToken);
      wsClient.joinConversation(direct.id);
      bannedListenerCleanupRef.current?.();
      bannedListenerCleanupRef.current = wsClient.onUserBanned((banData: { userId?: string }) => {
        if (banData.userId === session.profile.id) {
          alert(t('user.banned'));
          apiClientRef.current?.setTokens(null, null);
          handleLogoutLocal();
        }
      });
      setViewState('chat');

      registerWebPush(apiClient)
        .then(setWebPushSubscriptionId)
        .catch((error) => console.info('Web Push registration skipped', error));
    } catch (error: any) {
      console.error(error);
      setInitializationError(error.response?.data?.message || error.message || t('user.chat.initializationFailed'));
      setViewState('initialization-error');
    }
  };

  const handleLogin = async (username: string, password: string) => {
    if (!apiClient || !wsClient) return;
    setLoginError(null);

    let session: PendingSession;
    try {
      const data = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/login', { username, password });
      apiClient.setTokens(data.accessToken, data.refreshToken);
      const profile = await apiClient.get<UserIdentity>('/auth/me');
      if (profile.role === 'MASTER') {
        apiClient.setTokens(null, null);
        throw new Error(t('user.login.masterDenied'));
      }
      if (profile.status === 'DISABLED') {
        apiClient.setTokens(null, null);
        throw new Error(t('user.login.disabled'));
      }
      session = { profile, accessToken: data.accessToken };
      setPendingSession(session);
    } catch (error: any) {
      setLoginError(error.response?.data?.message || error.message || t('user.login.failed'));
      setViewState('login');
      return;
    }

    await initializeDirectChat(session);
  };

  const handleLogout = async () => {
    if (!apiClient) return;
    try {
      const refreshToken = apiClient.getRefreshToken();
      await deleteWebPushSubscription(apiClient, webPushSubscriptionId);
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

  const handleLanguageChange = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    writeLanguage(window.localStorage, nextLanguage);
  };

  const handleToggleLanguage = () => {
    const currentIndex = languages.findIndex((item) => item.code === language);
    const nextLanguage = languages[(currentIndex + 1) % languages.length].code;
    handleLanguageChange(nextLanguage);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    writeTheme(window.localStorage, nextTheme);
  };

  const renderView = () => {
    if (viewState === 'booting' || !apiClient || !wsClient) {
      return (
        <motion.main key="booting" className="centered-state" {...viewTransition}>
          <div className="state-message">{t('user.loading')}</div>
        </motion.main>
      );
    }

    if (viewState === 'initializing') {
      return (
        <motion.main key="initializing" className="centered-state" {...viewTransition}>
          <div className="state-message">{t('user.loading')}</div>
        </motion.main>
      );
    }

    if (viewState === 'initialization-error') {
      return (
        <motion.main key="initialization-error" className="centered-state" {...viewTransition}>
          <section className="state-card glass-panel" role="alert">
            <h1>{t('user.chat.initializationFailed')}</h1>
            {initializationError && <p>{initializationError}</p>}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => pendingSession && initializeDirectChat(pendingSession)}
            >
              {t('user.chat.retry')}
            </button>
          </section>
        </motion.main>
      );
    }

    if (viewState === 'chat' && user && directConversation) {
      return (
        <motion.main key="chat" className="direct-chat-shell" {...viewTransition}>
          <div className="direct-chat-main">
            <ChatWindow
              apiClient={apiClient}
              wsClient={wsClient}
              conversation={directConversation}
              currentUser={user}
              theme={theme}
              t={t}
              onToggleLanguage={handleToggleLanguage}
              onToggleTheme={handleToggleTheme}
              onLogout={handleLogout}
            />
          </div>
        </motion.main>
      );
    }

    return (
      <motion.main key="login" className="login-state" {...viewTransition}>
        <Login
          onLogin={handleLogin}
          error={loginError}
          t={t}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </motion.main>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
    </MotionConfig>
  );
}
