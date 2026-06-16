import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { UploadIntentDto } from './dto';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('upload-intent')
  createUploadIntent(@Body() dto: UploadIntentDto) {
    return this.attachments.createUploadIntent(dto);
  }

  @Get(':id/signed-url')
  createSignedDownloadUrl(@Param('id') id: string) {
    return this.attachments.createSignedDownloadUrl(id);
  }
}

