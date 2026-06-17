import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';

export type UploadIntentInput = {
  conversationId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
};

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Client,
    private readonly config: AppConfig
  ) {}

  async createUploadIntent(input: UploadIntentInput) {
    const objectKey = `${input.conversationId}/${randomUUID()}-${input.fileName}`;
    const attachment = await this.prisma.attachment.create({
      data: {
        conversationId: input.conversationId,
        objectKey,
        fileName: input.fileName,
        contentType: input.contentType,
        byteSize: input.byteSize
      }
    });
    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: objectKey,
      ContentType: input.contentType,
      CacheControl: 'no-store'
    });
    const uploadUrl = this.s3.config ? await getSignedUrl(this.s3, command, { expiresIn: this.config.s3SignedUrlTtlSeconds }) : '';
    return {
      id: attachment.id,
      uploadUrl,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      byteSize: attachment.byteSize,
      attachment,
      cacheControl: 'no-store',
      uploadHeaders: {
        'Content-Type': attachment.contentType,
        'Cache-Control': 'no-store'
      }
    };
  }

  async createSignedDownloadUrl(id: string) {
    const attachment = await this.prisma.attachment.findUniqueOrThrow({ where: { id } });
    const command = new GetObjectCommand({ Bucket: this.config.s3Bucket, Key: attachment.objectKey });
    return {
      attachmentId: attachment.id,
      url: await getSignedUrl(this.s3, command, { expiresIn: this.config.s3SignedUrlTtlSeconds }),
      cacheControl: 'no-store'
    };
  }
}
