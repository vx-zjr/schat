import { AttachmentsService } from './attachments.service';

describe('AttachmentsService', () => {
  it('creates an upload intent with a stable object key', async () => {
    const prisma: any = {
      attachment: {
        create: jest.fn(({ data }) => ({ id: 'attachment-1', ...data }))
      }
    };
    const service = new AttachmentsService(prisma, {} as any, {
      s3Bucket: 'media',
      s3SignedUrlTtlSeconds: 300
    } as any);

    const intent = await service.createUploadIntent({
      conversationId: 'conversation-1',
      fileName: 'photo.png',
      contentType: 'image/png',
      byteSize: 10
    });

    expect(intent.id).toBe('attachment-1');
    expect(intent.fileName).toBe('photo.png');
    expect(intent.byteSize).toBe(10);
    expect(intent.attachment.objectKey).toContain('conversation-1/');
    expect(intent.cacheControl).toBe('no-store');
  });
});
