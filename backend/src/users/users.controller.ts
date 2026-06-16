import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuthenticatedRequest } from '../auth/types';
import { CreateUserDto, UpdatePermissionsDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('users.read')
  listUsers() {
    return this.users.listUsers();
  }

  @Post()
  @RequirePermission('users.write')
  createUser(@Req() request: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.users.createUser(request.user.id, dto);
  }

  @Patch(':id')
  @RequirePermission('users.write')
  updateUser(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(request.user.id, id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermission('users.write')
  updatePermissions(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto
  ) {
    return this.users.updatePermissions(request.user.id, id, dto.permissions);
  }
}

