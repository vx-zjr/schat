import { loadConfig } from './load-config';

const requiredEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'access',
  JWT_REFRESH_SECRET: 'refresh',
  MASTER_USERNAME: 'master',
  MASTER_PASSWORD: 'password',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'media',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  LIVEKIT_URL: 'http://localhost:7880',
  LIVEKIT_API_KEY: 'lk-key',
  LIVEKIT_API_SECRET: 'lk-secret'
};

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...requiredEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads defaults for optional values', () => {
    const config = loadConfig();

    expect(config.PORT).toBe(3000);
    expect(config.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(config.S3_REGION).toBe('us-east-1');
    expect(config.S3_PUBLIC_ENDPOINT).toBe('http://localhost:9000');
    expect(config.SOCKET_IO_REDIS_ENABLED).toBe(false);
    expect(config.APNS_BUNDLE_ID).toBe('com.schat.mobile');
  });

  it('loads notification and realtime production options', () => {
    process.env.S3_PUBLIC_ENDPOINT = 'https://media.example.com';
    process.env.SOCKET_IO_REDIS_ENABLED = 'true';
    process.env.VAPID_PUBLIC_KEY = 'public';
    process.env.VAPID_PRIVATE_KEY = 'private';
    process.env.VAPID_SUBJECT = 'mailto:admin@example.com';
    process.env.FCM_PROJECT_ID = 'schat-prod';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './secrets/firebase.json';
    process.env.APNS_KEY_ID = 'key-id';
    process.env.APNS_TEAM_ID = 'team-id';
    process.env.APNS_KEY_PATH = './secrets/AuthKey.p8';
    process.env.APNS_PRODUCTION = 'true';

    const config = loadConfig();

    expect(config.S3_PUBLIC_ENDPOINT).toBe('https://media.example.com');
    expect(config.SOCKET_IO_REDIS_ENABLED).toBe(true);
    expect(config.VAPID_PUBLIC_KEY).toBe('public');
    expect(config.FCM_PROJECT_ID).toBe('schat-prod');
    expect(config.GOOGLE_APPLICATION_CREDENTIALS).toBe('./secrets/firebase.json');
    expect(config.APNS_PRODUCTION).toBe(true);
  });

  it('rejects missing required values', () => {
    delete process.env.DATABASE_URL;

    expect(() => loadConfig()).toThrow();
  });
});

