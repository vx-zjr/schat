import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Ban, MapPin, MessagesSquare, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import type { LanguageCode, ThemeMode } from 'shared';
import UtilityControls from '../components/UtilityControls';
import type { AdminPanel, AdminShellCallbacks, AdminTranslator } from '../types';

type AdminShellProps = AdminShellCallbacks & {
  activePanel: AdminPanel;
  username: string;
  role: 'MASTER' | 'USER';
  language: LanguageCode;
  theme: ThemeMode;
  headerTitle: string;
  t: AdminTranslator;
  children: ReactNode;
};

export default function AdminShell({
  activePanel,
  children,
  headerTitle,
  language,
  onLanguageChange,
  onLogout,
  onPanelChange,
  onThemeChange,
  role,
  t,
  theme,
  username
}: AdminShellProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);

  const destinations = [
    { id: 'chat', label: t('admin.nav.chats'), Icon: MessagesSquare },
    { id: 'users', label: t('admin.nav.users'), Icon: Users },
    { id: 'bans', label: t('admin.nav.bans'), Icon: Ban },
    { id: 'geoip', label: t('admin.nav.tools'), Icon: MapPin }
  ] satisfies { id: AdminPanel; label: string; Icon: LucideIcon }[];

  const openAccount = (trigger: HTMLButtonElement) => {
    accountTriggerRef.current = trigger;
    setIsAccountOpen(true);
  };

  const closeAccount = () => {
    setIsAccountOpen(false);
    requestAnimationFrame(() => accountTriggerRef.current?.focus());
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateCompactMode = () => setIsCompact(media.matches);
    media.addEventListener('change', updateCompactMode);
    return () => media.removeEventListener('change', updateCompactMode);
  }, []);

  useEffect(() => {
    if (!isAccountOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAccount();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = document.querySelectorAll<HTMLElement>(
          '[data-account-sheet] button:not([disabled]), [data-account-sheet] [href], [data-account-sheet] input:not([disabled]), [data-account-sheet] select:not([disabled]), [data-account-sheet] textarea:not([disabled])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-account-sheet] button')?.focus());
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAccountOpen]);

  const renderDestinations = (className: string, hidden: boolean) => (
    <nav className={className} aria-label={t('common.mainNavigation')} aria-hidden={hidden}>
      {destinations.map(({ id, label, Icon }) => {
        const isActive = activePanel === id;
        return (
          <button
            key={id}
            type="button"
            className={`admin-destination ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPanelChange(id)}
          >
            {isActive && <motion.span className="admin-destination-active" layoutId="admin-active-destination" />}
            <Icon aria-hidden="true" size={19} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-container">
        <aside className="desktop-sidebar glass-panel" aria-hidden={isCompact}>
          <div>
            <div className="sidebar-brand text-gradient-cyan">schat</div>
            {renderDestinations('sidebar-menu', isCompact)}
          </div>
          <button
            ref={accountTriggerRef}
            type="button"
            className="desktop-account-trigger"
            aria-label={t('common.openAccount')}
            onClick={(event) => openAccount(event.currentTarget)}
          >
            <UserRound aria-hidden="true" size={18} />
            <span>{username}</span>
          </button>
        </aside>
        <main className="main-content">
          <header className="main-header glass-panel">
            <h2 className="text-gradient-purple">{headerTitle}</h2>
            <div className="header-statuses">
              <span className="badge badge-success">{t('common.online')}</span>
              <span className="badge badge-primary">{role}</span>
            </div>
          </header>
          <section className="panel-container">{children}</section>
        </main>
        {renderDestinations('compact-bottom-nav', !isCompact)}
        <button type="button" className="compact-account-trigger" aria-hidden={!isCompact} aria-label={t('common.openAccount')} onClick={(event) => openAccount(event.currentTarget)}>
          <UserRound aria-hidden="true" size={20} />
        </button>
      </div>
      <AnimatePresence>
        {isAccountOpen && (
          <>
            <motion.div
              className="account-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              aria-hidden="true"
              onMouseDown={closeAccount}
            />
            <motion.section
              className="account-sheet"
              data-account-sheet
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-sheet-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22 }}
            >
              <div className="account-sheet-header">
                <h2 id="account-sheet-title">{t('admin.account.title')}</h2>
                <button type="button" className="modal-close" aria-label={t('common.close')} onClick={closeAccount}>
                  <X aria-hidden="true" size={20} />
                </button>
              </div>
              <UtilityControls
                username={username}
                role={role}
                language={language}
                onLanguageChange={onLanguageChange}
                theme={theme}
                onThemeChange={onThemeChange}
                onLogout={onLogout}
                t={t}
              />
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
