import { AuditModule } from './audit/audit.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { BansModule } from './bans/bans.module';
import { AppConfigModule } from './config/app-config.module';
import { ConversationsModule } from './conversations/conversations.module';
import { GeoipModule } from './geoip/geoip.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { VoiceModule } from './voice/voice.module';

export function createAppImports(localNoDb: boolean) {
  if (localNoDb) {
    return [AppConfigModule, HealthModule];
  }

  return [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    UsersModule,
    BansModule,
    ConversationsModule,
    MessagesModule,
    AttachmentsModule,
    VoiceModule,
    NotificationsModule,
    GeoipModule,
    HealthModule
  ];
}
