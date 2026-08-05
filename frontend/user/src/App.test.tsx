import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { UserIdentity } from './types';

const mocks = vi.hoisted(() => {
  const api = {
    get: vi.fn(),
    post: vi.fn(),
    setTokens: vi.fn(),
    getRefreshToken: vi.fn()
  };
  const ws = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinConversation: vi.fn(),
    leaveConversation: vi.fn(),
    onUserBanned: vi.fn(),
    onMessageCreated: vi.fn(),
    onMessageEdited: vi.fn(),
    onMessageDeleted: vi.fn(),
    onPresenceUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn()
  };

  return { api, ws };
});

vi.mock('shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('shared')>();
  return {
    ...actual,
    SchatApiClient: vi.fn(() => mocks.api),
    SchatWsClient: vi.fn(() => mocks.ws)
  };
});

vi.mock('./push', () => ({
  deleteWebPushSubscription: vi.fn().mockResolvedValue(undefined),
  registerWebPush: vi.fn().mockResolvedValue(null)
}));

const userProfile = {
  id: 'user-1',
  username: 'alice',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  permissions: []
};

const directConversation = {
  id: 'conversation-1',
  title: null,
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
  peer: { id: 'master-1', username: 'master' }
};

function arrangeSuccessfulLogin(profile: UserIdentity = userProfile) {
  mocks.api.post.mockImplementation(async (path: string) => {
    if (path === '/auth/login') {
      return { accessToken: 'access-token', refreshToken: 'refresh-token' };
    }
    throw new Error(`Unexpected POST ${path}`);
  });
  mocks.api.get.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return profile;
    if (path === '/user/direct-conversation') return directConversation;
    if (path === '/user/messages') return [];
    throw new Error(`Unexpected GET ${path}`);
  });
}

async function submitLogin() {
  const user = userEvent.setup();
  await user.selectOptions(await screen.findByRole('combobox'), 'en-US');
  await user.type(screen.getByRole('textbox'), 'alice');
  await user.type(document.querySelector('input[type="password"]') as HTMLInputElement, 'password');
  await user.click(screen.getByRole('button', { name: /secure handshake/i }));
}

describe('USER direct chat entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('schat.language.v1', 'en-US');
    mocks.ws.onUserBanned.mockReturnValue(() => undefined);
    mocks.ws.onMessageCreated.mockReturnValue(() => undefined);
    mocks.ws.onMessageEdited.mockReturnValue(() => undefined);
    mocks.ws.onMessageDeleted.mockReturnValue(() => undefined);
    mocks.ws.onPresenceUpdated.mockReturnValue(() => undefined);
  });

  afterEach(cleanup);

  it('opens the direct peer chat without rendering or requesting room navigation', async () => {
    arrangeSuccessfulLogin();
    render(<App />);

    await submitLogin();

    expect(await screen.findByRole('heading', { name: 'master' })).toBeVisible();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText('Chat Room')).not.toBeInTheDocument();
    expect(mocks.api.get).toHaveBeenCalledWith('/user/direct-conversation');
    expect(mocks.api.get).not.toHaveBeenCalledWith('/user/conversations');
    expect(mocks.api.get).not.toHaveBeenCalledWith('/admin/users');
  });

  it('rejects MASTER accounts, clears tokens, and shows the portal-specific error', async () => {
    arrangeSuccessfulLogin({
      id: 'master-1',
      username: 'master',
      role: 'MASTER',
      status: 'ACTIVE',
      permissions: []
    });
    render(<App />);

    await submitLogin();

    expect(await screen.findByText('Master accounts can only sign in to the admin portal')).toBeVisible();
    expect(mocks.api.setTokens).toHaveBeenLastCalledWith(null, null);
    await waitFor(() => {
      expect(mocks.api.get).not.toHaveBeenCalledWith('/user/direct-conversation');
    });
  });
});
