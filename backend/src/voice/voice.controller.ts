import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';
import { VoiceTokenDto } from './dto';
import { VoiceService } from './voice.service';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  @Post('token')
  createToken(@Req() request: AuthenticatedRequest, @Body() dto: VoiceTokenDto) {
    return this.voice.createToken(dto.room, request.user.id);
  }
}

