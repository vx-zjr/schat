import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import { languages, type LanguageCode, type ThemeMode } from 'shared';
import type { AdminTranslator } from '../types';

type UtilityControlsProps = {
  username: string;
  role: 'MASTER' | 'USER';
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => void;
  t: AdminTranslator;
};

export default function UtilityControls({
  username,
  role,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  onLogout,
  t
}: UtilityControlsProps) {
  const nextLanguage = languages[(languages.findIndex((item) => item.code === language) + 1) % languages.length];
  const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="utility-controls">
      <div className="account-identity">
        <strong>{username}</strong>
        <span>{role}</span>
      </div>
      <button type="button" className="utility-control" aria-label={t('common.switchLanguage')} onClick={() => onLanguageChange(nextLanguage.code)}>
        <Languages aria-hidden="true" size={18} />
        <span>{nextLanguage.label}</span>
      </button>
      <button
        type="button"
        className="utility-control"
        aria-label={t(nextTheme === 'light' ? 'common.theme.light' : 'common.theme.dark')}
        onClick={() => onThemeChange(nextTheme)}
      >
        {theme === 'dark' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        <span>{t(nextTheme === 'light' ? 'common.theme.light' : 'common.theme.dark')}</span>
      </button>
      <button type="button" className="btn btn-secondary utility-logout" onClick={onLogout}>
        <LogOut aria-hidden="true" size={18} />
        {t('common.logout')}
      </button>
    </div>
  );
}
