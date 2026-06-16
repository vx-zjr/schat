import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BansModule } from '../bans/bans.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AdminMessagesController } from './admin-messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { UserMessagesController } from './user-messages.controller';

@Module({
  imports: [AuditModule, AuthModule, BansModule, ConversationsModule],
  controllers: [AdminMessagesController, UserMessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService]
})
export class MessagesModule {}
