import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { LoginDto, RefreshDto } from './auth/dto';
import { CreateBanDto } from './bans/dto';
import { CreateConversationDto } from './conversations/dto';
import { UploadIntentDto } from './attachments/dto';
import { SendMessageDto } from './messages/dto';
import { RegisterNotificationSubscriptionDto } from './notifications/dto';
import { CreateUserDto, UpdatePermissionsDto, UpdateUserDto } from './users/dto';
import { VoiceTokenDto } from './voice/dto';

@Controller('contract-probe')
class ContractProbeController {
  @Post('login')
  login(@Body() _dto: LoginDto) {
    return undefined;
  }

  @Post('refresh')
  refresh(@Body() _dto: RefreshDto) {
    return undefined;
  }

  @Post('users')
  createUser(@Body() _dto: CreateUserDto) {
    return undefined;
  }

  @Post('users-update')
  updateUser(@Body() _dto: UpdateUserDto) {
    return undefined;
  }

  @Post('permissions')
  updatePermissions(@Body() _dto: UpdatePermissionsDto) {
    return undefined;
  }

  @Post('bans')
  createBan(@Body() _dto: CreateBanDto) {
    return undefined;
  }

  @Post('conversations')
  createConversation(@Body() _dto: CreateConversationDto) {
    return undefined;
  }

  @Post('messages')
  sendMessage(@Body() _dto: SendMessageDto) {
    return undefined;
  }

  @Post('attachments')
  uploadIntent(@Body() _dto: UploadIntentDto) {
    return undefined;
  }

  @Post('voice')
  voiceToken(@Body() _dto: VoiceTokenDto) {
    return undefined;
  }

  @Post('notification-subscriptions')
  registerNotificationSubscription(@Body() _dto: RegisterNotificationSubscriptionDto) {
    return undefined;
  }
}

describe('OpenAPI DTO schemas', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  function schemaProperties(name: string) {
    return (document.components?.schemas?.[name] as { properties?: Record<string, unknown> } | undefined)?.properties;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ContractProbeController]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    await app.close();
  });

  it('publishes request DTO properties for frontend contract generation', () => {
    expect(schemaProperties('LoginDto')).toEqual(
      expect.objectContaining({ username: expect.any(Object), password: expect.any(Object) })
    );
    expect(schemaProperties('RefreshDto')).toEqual(
      expect.objectContaining({ refreshToken: expect.any(Object) })
    );
    expect(schemaProperties('CreateUserDto')).toEqual(
      { username: expect.any(Object), password: expect.any(Object) }
    );
    expect(schemaProperties('UpdateUserDto')).toEqual(
      { status: expect.any(Object) }
    );
    expect(schemaProperties('UpdatePermissionsDto')).toEqual(
      expect.objectContaining({ permissions: expect.any(Object) })
    );
    expect(schemaProperties('CreateBanDto')).toEqual(
      expect.objectContaining({ userId: expect.any(Object), ip: expect.any(Object), reason: expect.any(Object) })
    );
    expect(schemaProperties('CreateConversationDto')).toEqual(
      expect.objectContaining({ title: expect.any(Object), memberIds: expect.any(Object) })
    );
    expect(schemaProperties('SendMessageDto')).toEqual(
      expect.objectContaining({ conversationId: expect.any(Object), body: expect.any(Object), attachmentIds: expect.any(Object) })
    );
    expect(schemaProperties('UploadIntentDto')).toEqual(
      expect.objectContaining({ conversationId: expect.any(Object), fileName: expect.any(Object), contentType: expect.any(Object), byteSize: expect.any(Object) })
    );
    expect(schemaProperties('VoiceTokenDto')).toEqual(
      expect.objectContaining({ room: expect.any(Object) })
    );
    expect(schemaProperties('RegisterNotificationSubscriptionDto')).toEqual(
      expect.objectContaining({ provider: expect.any(Object), endpoint: expect.any(Object), keys: expect.any(Object), platform: expect.any(Object), deviceId: expect.any(Object) })
    );
  });
});
