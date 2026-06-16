import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';
import { SendMessageDto } from './dto';
import { MessagesService } from './messages.service';

@Controller('user/messages')
@UseGuards(JwtAuthGuard)
export class UserMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  listMessages(@Req() request: AuthenticatedRequest) {
    return this.messages.listUserMessages(request.user.id);
  }

  @Post()
  sendMessage(@Req() request: AuthenticatedRequest, @Body() dto: SendMessageDto) {
    return this.messages.sendTextMessage(request.user.id, dto);
  }
}

