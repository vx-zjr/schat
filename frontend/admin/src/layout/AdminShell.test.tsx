import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import { expect, test } from 'vitest';
import AdminShell from './AdminShell';

const t = createTranslator(DEFAULT_LANGUAGE);

test('renders the four destinations and opens the account sheet', async () => {
  const user = userEvent.setup();

  render(
    <AdminShell
      activePanel="chat"
      onPanelChange={() => undefined}
      username="operator"
      role="MASTER"
      language={DEFAULT_LANGUAGE}
      onLanguageChange={() => undefined}
      theme="dark"
      onThemeChange={() => undefined}
      onLogout={() => undefined}
      headerTitle="Live Chat Supervision"
      t={t}
    >
      <div>Panel content</div>
    </AdminShell>
  );

  expect(screen.getByRole('navigation', { name: t('common.mainNavigation') })).toBeVisible();
  expect(screen.getByRole('button', { name: t('admin.nav.chats') })).toBeVisible();
  expect(screen.getByRole('button', { name: t('admin.nav.users') })).toBeVisible();
  expect(screen.getByRole('button', { name: t('admin.nav.bans') })).toBeVisible();
  expect(screen.getByRole('button', { name: t('admin.nav.tools') })).toBeVisible();
  await user.click(screen.getByRole('button', { name: t('common.openAccount') }));
  expect(screen.getByRole('dialog', { name: t('admin.account.title') })).toBeVisible();
});
