import { Injectable } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { AppConfig } from '../config/app-config';

@Injectable()
export class VoiceService {
  constructor(private readonly config: AppConfig) {}

  async createToken(room: string, identity: string) {
    const token = new AccessToken(this.config.livekitApiKey, this.config.livekitApiSecret, { identity });
    token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    return { token: await token.toJwt() };
  }
}

