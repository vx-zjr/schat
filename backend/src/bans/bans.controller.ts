import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/types';
import { BansService } from './bans.service';
import { CreateBanDto } from './dto';

@Controller('admin/bans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BansController {
  constructor(private readonly bans: BansService) {}

  @Get()
  @RequirePermission('bans.read')
  listBans() {
    return this.bans.listBans();
  }

  @Post()
  @RequirePermission('bans.write')
  createBan(@Req() request: AuthenticatedRequest, @Body() dto: CreateBanDto) {
    return this.bans.createBan(request.user.id, dto);
  }

  @Delete(':id')
  @RequirePermission('bans.write')
  liftBan(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.bans.liftBan(request.user.id, id);
  }
}

