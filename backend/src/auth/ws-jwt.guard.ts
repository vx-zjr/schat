import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AppConfig } from '../config/app-config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const rawToken = client.handshake.auth?.token ?? client.handshake.headers.authorization;
    const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing websocket token');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.jwtAccessSecret });
    } catch {
      throw new UnauthorizedException('Invalid websocket token');
    }
    (client.data as any).user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions ?? []
    };
    return true;
  }
}
