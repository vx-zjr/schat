import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { hashPassword } from './passwords';

function createPrisma() {
  const users: any[] = [];
  const refreshTokens: any[] = [];

  return {
    users,
    refreshTokens,
    user: {
      findUnique: jest.fn(({ where }) => users.find((user) => user.username === where.username || user.id === where.id) ?? null),
      create: jest.fn(({ data }) => {
        const user = { id: `user-${users.length + 1}`, status: UserStatus.ACTIVE, permissions: [], ...data };
        users.push(user);
        return user;
      })
    },
    refreshToken: {
      create: jest.fn(({ data }) => {
        const token = { id: `refresh-${refreshTokens.length + 1}`, revokedAt: null, createdAt: new Date(), ...data };
        refreshTokens.push(token);
        return token;
      }),
      findUnique: jest.fn(({ where }) => refreshTokens.find((token) => token.tokenHash === where.tokenHash) ?? null),
      update: jest.fn(({ where, data }) => {
        const token = refreshTokens.find((item) => item.id === where.id);
        Object.assign(token, data);
        return token;
      })
    }
  };
}

describe('AuthService', () => {
  const config: any = {
    jwtAccessSecret: 'access-secret',
    jwtRefreshSecret: 'refresh-secret',
    jwtAccessTtlSeconds: 900,
    jwtRefreshTtlSeconds: 3600,
    masterUsername: 'master',
    masterPassword: 'master-password'
  };

  it('creates the master user once', async () => {
    const prisma = createPrisma();
    const service = new AuthService(prisma as any, new JwtService(), config);

    await service.ensureMasterUser();
    await service.ensureMasterUser();

    expect(prisma.users).toHaveLength(1);
    expect(prisma.users[0].role).toBe(UserRole.MASTER);
  });

  it('logs in an active user and stores a refresh token hash', async () => {
    const prisma = createPrisma();
    prisma.users.push({
      id: 'user-1',
      username: 'alice',
      passwordHash: await hashPassword('secret'),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: []
    });
    const service = new AuthService(prisma as any, new JwtService(), config);

    const result = await service.login('alice', 'secret');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshTokens).toHaveLength(1);
    expect(prisma.refreshTokens[0].tokenHash).not.toBe(result.refreshToken);
  });

  it('rejects a disabled user', async () => {
    const prisma = createPrisma();
    prisma.users.push({
      id: 'user-1',
      username: 'alice',
      passwordHash: await hashPassword('secret'),
      role: UserRole.USER,
      status: UserStatus.DISABLED,
      permissions: []
    });
    const service = new AuthService(prisma as any, new JwtService(), config);

    await expect(service.login('alice', 'secret')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens by revoking the old refresh token', async () => {
    const prisma = createPrisma();
    prisma.users.push({
      id: 'user-1',
      username: 'alice',
      passwordHash: await hashPassword('secret'),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: []
    });
    const service = new AuthService(prisma as any, new JwtService(), config);

    const first = await service.login('alice', 'secret');
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(prisma.refreshTokens[0].revokedAt).toBeInstanceOf(Date);
    expect(prisma.refreshTokens).toHaveLength(2);
  });
});

