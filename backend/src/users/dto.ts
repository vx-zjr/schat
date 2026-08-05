import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  username!: string;

  @ApiProperty({ minLength: 1, example: 'alice123' })
  @IsString()
  @MinLength(1)
  password!: string;

}

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdatePermissionsDto {
  @ApiProperty({ type: [String], example: ['messages.manage', 'users.read'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
