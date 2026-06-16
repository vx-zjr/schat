import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../config/app-config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.jwtAccessSecret });
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
    request.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions ?? []
    };
    return true;
  }
}
