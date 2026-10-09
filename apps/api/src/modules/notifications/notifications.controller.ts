import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CustomerAuthUser, InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createNotificationSchema, updateNotificationSchema } from './notification.schemas';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.read')
  listAdmin(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.listAdmin(page ? Number(page) : 1, limit ? Number(limit) : 10);
  }

  @Get('internal')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.read')
  listForInternal(@CurrentUser() user: InternalAuthUser) {
    return this.notificationsService.listForInternal(user);
  }

  @Get('customer')
  @UseGuards(CustomerJwtAuthGuard)
  listForCustomer(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.notificationsService.listForCustomer(customer);
  }

  @Get('internal/unread-count')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.read')
  countUnreadForInternal(@CurrentUser() user: InternalAuthUser) {
    return this.notificationsService.countUnreadForInternal(user).then((count) => ({ count }));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.manage')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.notificationsService.create(parseBody(createNotificationSchema, body), user, request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.manage')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.notificationsService.update(id, parseBody(updateNotificationSchema, body), user, request);
  }

  @Post(':id/internal/read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('notifications.read')
  markInternalRead(@Param('id') id: string, @CurrentUser() user: InternalAuthUser) {
    return this.notificationsService.markInternalRead(id, user);
  }

  @Post(':id/customer/read')
  @UseGuards(CustomerJwtAuthGuard)
  markCustomerRead(@Param('id') id: string, @CurrentCustomer() customer: CustomerAuthUser) {
    return this.notificationsService.markCustomerRead(id, customer);
  }

  @Post('customer/read-all')
  @UseGuards(CustomerJwtAuthGuard)
  markAllCustomerRead(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.notificationsService.markAllCustomerRead(customer);
  }
}
