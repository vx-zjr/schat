import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';
import { RegisterNotificationSubscriptionDto } from './dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return this.notifications.getVapidPublicKey();
  }

  @Post('subscriptions')
  registerSubscription(@Req() req: AuthenticatedRequest, @Body() dto: RegisterNotificationSubscriptionDto) {
    return this.notifications.registerSubscription(req.user.id, dto);
  }

  @Delete('subscriptions/:id')
  deleteSubscription(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notifications.deleteSubscription(req.user.id, id);
  }
}
