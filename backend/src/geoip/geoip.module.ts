import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeoipController } from './geoip.controller';
import { GeoipService } from './geoip.service';

@Module({
  imports: [AuthModule],
  controllers: [GeoipController],
  providers: [GeoipService],
  exports: [GeoipService]
})
export class GeoipModule {}

