import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BansController } from './bans.controller';
import { BansService } from './bans.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [BansController],
  providers: [BansService],
  exports: [BansService]
})
export class BansModule {}

