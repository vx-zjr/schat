import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/types';
import { EditMessageDto } from './dto';
import { MessagesService } from './messages.service';

@Controller('admin/messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @RequirePermission('messages.read')
  listMessages() {
    return this.messages.listAdminMessages();
  }

  @Patch(':id')
  @RequirePermission('messages.write')
  editMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: EditMessageDto) {
    return this.messages.editMessage(request.user.id, id, dto.body);
  }

  @Delete(':id')
  @RequirePermission('messages.write')
  deleteMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.deleteMessage(request.user.id, id);
  }
}

