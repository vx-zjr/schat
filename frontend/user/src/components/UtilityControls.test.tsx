import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslator } from 'shared';
import UtilityControls from './UtilityControls';

describe('UtilityControls', () => {
  afterEach(cleanup);

  it('exposes localized 44-pixel icon controls and invokes each callback', async () => {
    const onToggleLanguage = vi.fn();
    const onToggleTheme = vi.fn();
    const onLogout = vi.fn();
    const user = userEvent.setup();

    render(
      <UtilityControls
        theme="dark"
        t={createTranslator('en-US')}
        onToggleLanguage={onToggleLanguage}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />
    );

    const language = screen.getByRole('button', { name: 'Switch language' });
    const theme = screen.getByRole('button', { name: 'Light' });
    const logout = screen.getByRole('button', { name: 'Logout' });

    expect(language).toHaveAttribute('title', 'Switch language');
    expect(theme).toHaveAttribute('title', 'Light');
    expect(logout).toHaveAttribute('title', 'Logout');
    for (const button of [language, theme, logout]) {
      expect(button).toHaveClass('icon-button');
    }

    await user.click(language);
    await user.click(theme);
    await user.click(logout);
    expect(onToggleLanguage).toHaveBeenCalledOnce();
    expect(onToggleTheme).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
