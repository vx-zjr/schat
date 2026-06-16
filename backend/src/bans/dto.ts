import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBanDto {
  @ApiPropertyOptional({ description: 'User id to ban. At least one of userId or ip should be supplied by the caller.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '203.0.113.10' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ example: 'Repeated abuse in chat.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
