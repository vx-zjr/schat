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
  });

  it('rejects missing required values', () => {
    delete process.env.DATABASE_URL;

    expect(() => loadConfig()).toThrow();
  });
});

