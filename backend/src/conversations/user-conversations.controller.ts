import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';
import { ConversationsService } from './conversations.service';

@Controller('user/conversations')
@UseGuards(JwtAuthGuard)
export class UserConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.conversations.listUserConversations(request.user.id);
  }
}

