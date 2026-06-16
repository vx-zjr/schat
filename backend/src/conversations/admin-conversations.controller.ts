import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/types';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto';

@Controller('admin/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @RequirePermission('conversations.read')
  listConversations() {
    return this.conversations.listAdminConversations();
  }

  @Post()
  @RequirePermission('conversations.write')
  createConversation(@Req() request: AuthenticatedRequest, @Body() dto: CreateConversationDto) {
    return this.conversations.createConversation(request.user.id, dto);
  }
}

