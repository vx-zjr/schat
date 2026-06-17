import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { AuthModule } from '../auth/auth.module';
import { AppConfig } from '../config/app-config';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [AuthModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    {
      provide: S3Client,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        new S3Client({
          endpoint: config.s3PublicEndpoint,
          region: config.s3Region,
          forcePathStyle: true,
          credentials: { accessKeyId: config.s3AccessKey, secretAccessKey: config.s3SecretKey }
        })
    }
  ]
})
export class AttachmentsModule {}

