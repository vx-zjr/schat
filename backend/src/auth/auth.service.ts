import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, hashToken, verifyPassword } from './passwords';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig
  ) {}

  async ensureMasterUser(): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { username: this.config.masterUsername } });
    if (existing) {
      return;
    }

    await this.prisma.user.create({
      data: {
        username: this.config.masterUsername,
        passwordHash: await hashPassword(this.config.masterPassword),
        role: UserRole.MASTER,
        status: UserStatus.ACTIVE,
        permissions: []
      }
    });
  }

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== UserStatus.ACTIVE || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    }
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, role: user.role, permissions: user.permissions },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtlSeconds }
    );
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + this.config.jwtRefreshTtlSeconds * 1000)
      }
    });

    return { accessToken, refreshToken };
  }
}

