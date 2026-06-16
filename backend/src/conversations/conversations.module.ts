import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AdminConversationsController } from './admin-conversations.controller';
import { ConversationsService } from './conversations.service';
import { UserConversationsController } from './user-conversations.controller';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AdminConversationsController, UserConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService]
})
export class ConversationsModule {}

