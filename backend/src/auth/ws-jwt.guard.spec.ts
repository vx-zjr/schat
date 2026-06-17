import { ExecutionContext } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  it('attaches the socket identity and joins the user notification room', async () => {
    const client: any = {
      handshake: { auth: { token: 'Bearer access-token' }, headers: {} },
      data: {},
      join: jest.fn()
    };
    const context = {
      switchToWs: () => ({ getClient: () => client })
    } as ExecutionContext;
    const jwt: any = {
      verifyAsync: jest.fn(() => ({
        sub: 'user-1',
        username: 'alice',
        role: 'USER',
        permissions: ['messages.send']
      }))
    };
    const guard = new WsJwtGuard(jwt, { jwtAccessSecret: 'secret' } as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(client.data.user).toEqual({
      id: 'user-1',
      username: 'alice',
      role: 'USER',
      permissions: ['messages.send']
    });
    expect(client.join).toHaveBeenCalledWith('user:user-1');
  });
});
