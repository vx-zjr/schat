import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';
import { ConversationsService } from './conversations.service';

@Controller('user/direct-conversation')
@UseGuards(JwtAuthGuard)
export class UserDirectConversationController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  getDirectConversation(@Req() request: AuthenticatedRequest) {
    if (request.user.role !== UserRole.USER) {
      throw new ForbiddenException('The USER client is available to USER accounts only');
    }
    return this.conversations.getDirectConversation(request.user.id);
  }
}
