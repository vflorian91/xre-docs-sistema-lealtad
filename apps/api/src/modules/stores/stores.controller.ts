import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import {
  assignUsersToStoreSchema,
  createStoreSchema,
  listStoresSchema,
  setActiveStoreSchema,
  updateStoreSchema,
} from './store.schemas';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('public')
  listPublicStores(@Query('search') search?: string) {
    return this.storesService.listPublicStores(search);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('stores.read')
  listStores(@Query() query: unknown) {
    return this.storesService.listStores(parseBody(listStoresSchema, query));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('stores.create')
  createStore(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.storesService.createStore(parseBody(createStoreSchema, body), user, request);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  getMyStores(@CurrentUser() user: InternalAuthUser) {
    return this.storesService.getMyStores(user);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  getActiveStore(@CurrentUser() user: InternalAuthUser) {
    return this.storesService.getActiveStore(user);
  }

  @Post('active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  setActiveStore(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.storesService.setActiveStore(parseBody(setActiveStoreSchema, body), user, request);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('stores.view_profile')
  getStore(@Param('id') id: string) {
    return this.storesService.getStoreDetail(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  updateStore(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.storesService.updateStore(id, parseBody(updateStoreSchema, body), user, request);
  }

  @Post(':id/users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('stores.assign_users')
  assignUsers(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.storesService.assignUsers(id, parseBody(assignUsersToStoreSchema, body), user, request);
  }
}
