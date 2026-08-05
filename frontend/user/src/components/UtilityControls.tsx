import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import type { I18nKey, ThemeMode } from 'shared';

type UtilityControlsProps = {
  theme: ThemeMode;
  t: (key: I18nKey) => string;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

export default function UtilityControls({
  theme,
  t,
  onToggleLanguage,
  onToggleTheme,
  onLogout
}: UtilityControlsProps) {
  const themeLabel = t(theme === 'dark' ? 'common.theme.light' : 'common.theme.dark');
  const languageLabel = t('common.switchLanguage');
  const logoutLabel = t('common.logout');

  return (
    <div className="utility-controls">
      <motion.button
        type="button"
        className="icon-button"
        aria-label={languageLabel}
        title={languageLabel}
        onClick={onToggleLanguage}
        whileTap={{ scale: 0.96 }}
      >
        <Languages aria-hidden="true" size={20} />
      </motion.button>
      <motion.button
        type="button"
        className="icon-button"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={onToggleTheme}
        whileTap={{ scale: 0.96 }}
      >
        {theme === 'dark' ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
      </motion.button>
      <motion.button
        type="button"
        className="icon-button"
        aria-label={logoutLabel}
        title={logoutLabel}
        onClick={onLogout}
        whileTap={{ scale: 0.96 }}
      >
        <LogOut aria-hidden="true" size={20} />
      </motion.button>
    </div>
  );
}
