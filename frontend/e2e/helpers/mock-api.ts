import type { Page } from '@playwright/test';

const now = '2026-08-05T00:00:00.000Z';
const master = { id: 'master-1', username: 'master', role: 'MASTER', status: 'ACTIVE', permissions: ['users.read', 'users.write'] };
const user = { id: 'user-1', username: 'test', role: 'USER', status: 'ACTIVE', permissions: [] };
const conversation = {
  id: 'direct-1', title: null, createdAt: now, updatedAt: now,
  members: [
    { id: 'member-master', userId: master.id, conversationId: 'direct-1' },
    { id: 'member-user', userId: user.id, conversationId: 'direct-1' }
  ]
};
const messages = [{ id: 'message-1', conversationId: conversation.id, senderId: master.id, body: 'Welcome', kind: 'TEXT', createdAt: now, editedAt: null, deletedAt: null }];

async function mock(page: Page, path: string | RegExp, body: unknown) {
  await page.route(path, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }));
}

export async function mockUserApi(page: Page) {
  await mock(page, '**/auth/login', { accessToken: 'user-access', refreshToken: 'user-refresh' });
  await mock(page, '**/auth/logout', {});
  await mock(page, '**/auth/me', user);
  await mock(page, '**/user/direct-conversation', { id: conversation.id, title: null, createdAt: now, updatedAt: now, peer: { id: master.id, username: master.username } });
  await mock(page, '**/user/messages', messages);
  await mock(page, '**/notifications/vapid-public-key', { publicKey: null });
  await mock(page, '**/notifications/subscriptions**', { id: 'subscription-1' });
}

export async function mockAdminApi(page: Page) {
  await mock(page, '**/auth/login', { accessToken: 'master-access', refreshToken: 'master-refresh' });
  await mock(page, '**/auth/logout', {});
  await mock(page, '**/auth/me', master);
  await mock(page, '**/admin/users', [master, user]);
  await mock(page, '**/admin/conversations', [conversation]);
  await mock(page, '**/admin/messages', messages);
  await mock(page, '**/admin/bans', []);
  await mock(page, /\/admin\/geoip\/.+/, { ip: '8.8.8.8', country: 'US', region: 'California', city: 'Mountain View' });
}
