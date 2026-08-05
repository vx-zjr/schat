import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTranslator, DEFAULT_LANGUAGE } from 'shared';
import { expect, test, vi } from 'vitest';
import ConversationsPanel from './ConversationsPanel';

const t = createTranslator(DEFAULT_LANGUAGE);

test('returns from an active conversation to the labeled room list', async () => {
  const user = userEvent.setup();
  const ws = {
    joinConversation: vi.fn(),
    leaveConversation: vi.fn(),
    onMessageCreated: vi.fn(() => () => undefined),
    onMessageEdited: vi.fn(() => () => undefined),
    onMessageDeleted: vi.fn(() => () => undefined),
    onPresenceUpdated: vi.fn(() => () => undefined),
  };
  const api = {
    get: vi.fn((path: string) => {
      if (path === '/admin/conversations') {
        return Promise.resolve([{
          id: 'conversation-1',
          title: 'test',
          createdAt: '2026-08-06T00:00:00.000Z',
          updatedAt: '2026-08-06T00:00:00.000Z',
          members: [{ id: 'member-1', userId: 'admin-1', conversationId: 'conversation-1' }],
        }]);
      }
      if (path === '/admin/messages') return Promise.resolve([]);
      return Promise.resolve([{ id: 'admin-1', username: 'admin' }]);
    }),
  };

  render(
    <ConversationsPanel
      apiClient={api as any}
      wsClient={ws as any}
      currentUser={{ id: 'admin-1', username: 'admin', role: 'MASTER', status: 'ACTIVE', permissions: [] }}
      t={t}
    />
  );

  expect(await screen.findByRole('list', { name: t('admin.chat.rooms') })).toBeVisible();
  await user.click(screen.getByRole('button', { name: /test/ }));
  expect(screen.getByRole('button', { name: t('common.back') })).toBeVisible();
  await user.click(screen.getByRole('button', { name: t('common.back') }));
  expect(screen.getByRole('list', { name: t('admin.chat.rooms') })).toBeVisible();
  expect(ws.leaveConversation).toHaveBeenCalled();
});
