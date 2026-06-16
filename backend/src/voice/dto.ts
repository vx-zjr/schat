import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VoiceTokenDto {
  @ApiProperty({ description: 'LiveKit room name.' })
  @IsString()
  room!: string;
}
