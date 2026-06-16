import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class UploadIntentDto {
  @ApiProperty({ description: 'Conversation id the attachment belongs to.' })
  @IsString()
  conversationId!: string;

  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType!: string;

  @ApiProperty({ minimum: 1, example: 102400 })
  @IsInt()
  @Min(1)
  byteSize!: number;
}
