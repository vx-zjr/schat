import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { GeoipService } from './geoip.service';

@Controller('admin/geoip')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GeoipController {
  constructor(private readonly geoip: GeoipService) {}

  @Get(':ip')
  @RequirePermission('geoip.read')
  lookup(@Param('ip') ip: string) {
    return this.geoip.lookup(ip);
  }
}

