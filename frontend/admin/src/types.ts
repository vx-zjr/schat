import type { I18nKey, LanguageCode, ThemeMode } from 'shared';

export type AdminPanel = 'chat' | 'users' | 'bans' | 'geoip';

export type AdminShellCallbacks = {
  onPanelChange: (panel: AdminPanel) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => void;
};

export type AdminTranslator = (key: I18nKey) => string;
