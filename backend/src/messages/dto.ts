import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation id the message is sent to.' })
  @IsString()
  conversationId!: string;

  @ApiProperty({ minLength: 1, example: 'hello' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({ type: [String], description: 'Attachment ids previously created with upload-intent.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class EditMessageDto {
  @ApiProperty({ minLength: 1, example: 'updated text' })
  @IsString()
  @MinLength(1)
  body!: string;
}
