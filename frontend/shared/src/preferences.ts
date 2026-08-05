import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from './i18n.js';

export type ThemeMode = 'light' | 'dark';

export const LANGUAGE_STORAGE_KEY = 'schat.language.v1';
export const THEME_STORAGE_KEY = 'schat.theme.v1';

export function readLanguage(storage: Pick<Storage, 'getItem'>): LanguageCode {
  const value = storage.getItem(LANGUAGE_STORAGE_KEY);
  return value && isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

export function writeLanguage(storage: Pick<Storage, 'setItem'>, value: LanguageCode): void {
  storage.setItem(LANGUAGE_STORAGE_KEY, value);
}

export function readTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): ThemeMode {
  const value = storage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : prefersDark ? 'dark' : 'light';
}

export function writeTheme(storage: Pick<Storage, 'setItem'>, value: ThemeMode): void {
  storage.setItem(THEME_STORAGE_KEY, value);
}

export function applyTheme(root: Pick<HTMLElement, 'dataset' | 'style'>, value: ThemeMode): void {
  root.dataset.theme = value;
  root.style.colorScheme = value;
}
