import { VoiceService } from './voice.service';

describe('VoiceService', () => {
  it('creates a LiveKit token for a room and identity', async () => {
    const service = new VoiceService({ livekitApiKey: 'key', livekitApiSecret: 'secret' } as any);

    const result = await service.createToken('room-1', 'user-1');

    expect(result.token).toEqual(expect.any(String));
  });
});

