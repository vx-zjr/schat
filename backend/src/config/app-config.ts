import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoadedConfig } from './load-config';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<LoadedConfig, true>) {}

  get port(): number {
    return Number(this.config.get('PORT', { infer: true }));
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessTtlSeconds(): number {
    return Number(this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }));
  }

  get jwtRefreshTtlSeconds(): number {
    return Number(this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }));
  }

  get masterUsername(): string {
    return this.config.get('MASTER_USERNAME', { infer: true });
  }

  get masterPassword(): string {
    return this.config.get('MASTER_PASSWORD', { infer: true });
  }

  get s3Endpoint(): string {
    return this.config.get('S3_ENDPOINT', { infer: true });
  }

  get s3PublicEndpoint(): string {
    return this.config.get('S3_PUBLIC_ENDPOINT', { infer: true });
  }

  get s3Region(): string {
    return this.config.get('S3_REGION', { infer: true });
  }

  get s3Bucket(): string {
    return this.config.get('S3_BUCKET', { infer: true });
  }

  get s3AccessKey(): string {
    return this.config.get('S3_ACCESS_KEY', { infer: true });
  }

  get s3SecretKey(): string {
    return this.config.get('S3_SECRET_KEY', { infer: true });
  }

  get s3SignedUrlTtlSeconds(): number {
    return Number(this.config.get('S3_SIGNED_URL_TTL_SECONDS', { infer: true }));
  }

  get socketIoRedisEnabled(): boolean {
    return this.config.get('SOCKET_IO_REDIS_ENABLED', { infer: true });
  }

  get livekitUrl(): string {
    return this.config.get('LIVEKIT_URL', { infer: true });
  }

  get livekitApiKey(): string {
    return this.config.get('LIVEKIT_API_KEY', { infer: true });
  }

  get livekitApiSecret(): string {
    return this.config.get('LIVEKIT_API_SECRET', { infer: true });
  }

  get geoipDataDir(): string {
    return this.config.get('GEOIP_DATA_DIR', { infer: true });
  }

  get vapidPublicKey(): string | undefined {
    return this.config.get('VAPID_PUBLIC_KEY', { infer: true });
  }

  get vapidPrivateKey(): string | undefined {
    return this.config.get('VAPID_PRIVATE_KEY', { infer: true });
  }

  get vapidSubject(): string | undefined {
    return this.config.get('VAPID_SUBJECT', { infer: true });
  }

  get fcmProjectId(): string | undefined {
    return this.config.get('FCM_PROJECT_ID', { infer: true });
  }

  get googleApplicationCredentials(): string | undefined {
    return this.config.get('GOOGLE_APPLICATION_CREDENTIALS', { infer: true });
  }

  get apnsKeyId(): string | undefined {
    return this.config.get('APNS_KEY_ID', { infer: true });
  }

  get apnsTeamId(): string | undefined {
    return this.config.get('APNS_TEAM_ID', { infer: true });
  }

  get apnsBundleId(): string {
    return this.config.get('APNS_BUNDLE_ID', { infer: true });
  }

  get apnsKeyPath(): string | undefined {
    return this.config.get('APNS_KEY_PATH', { infer: true });
  }

  get apnsProduction(): boolean {
    return this.config.get('APNS_PRODUCTION', { infer: true });
  }
}
