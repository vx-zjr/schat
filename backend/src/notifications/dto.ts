import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class RegisterNotificationSubscriptionDto {
  @ApiProperty({ enum: ['web-push', 'fcm', 'apns'] })
  @IsIn(['web-push', 'fcm', 'apns'])
  provider!: 'web-push' | 'fcm' | 'apns';

  @ApiProperty({ description: 'Push endpoint URL for Web Push, or device token for FCM/APNs.' })
  @IsString()
  endpoint!: string;

  @ApiPropertyOptional({ description: 'Web Push subscription keys.' })
  @IsOptional()
  @IsObject()
  keys?: { p256dh?: string; auth?: string };

  @ApiPropertyOptional({ example: 'web' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 'browser-1' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
