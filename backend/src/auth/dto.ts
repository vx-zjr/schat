import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'master' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'master123', minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token returned from login or refresh.' })
  @IsString()
  refreshToken!: string;
}
