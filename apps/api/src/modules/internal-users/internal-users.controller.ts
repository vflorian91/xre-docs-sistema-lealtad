import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createInternalUserSchema, createRoleSchema, updateInternalUserPermissionsSchema, updateInternalUserSchema, updateRoleSchema } from './internal-user.schemas';
import { InternalUsersService } from './internal-users.service';

@Controller('internal-users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InternalUsersController {
  constructor(private readonly internalUsersService: InternalUsersService) {}

  @Get()
  @RequirePermissions('users.read')
  listUsers() {
    return this.internalUsersService.listUsers();
  }

  @Post()
  @RequirePermissions('users.create')
  createUser(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.internalUsersService.createUser(parseBody(createInternalUserSchema, body), user, request);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.internalUsersService.updateUser(id, parseBody(updateInternalUserSchema, body), user, request);
  }

  @Patch(':id/permissions')
  @RequirePermissions('users.manage_permissions')
  updateUserPermissions(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.internalUsersService.updateUserPermissions(id, parseBody(updateInternalUserPermissionsSchema, body), user, request);
  }

  @Get('roles')
  @RequirePermissions('roles.read')
  listRoles(@Query('includeInactive') includeInactive?: string) {
    return this.internalUsersService.listRoles(includeInactive === 'true');
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  createRole(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.internalUsersService.createRole(parseBody(createRoleSchema, body), user, request);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  updateRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.internalUsersService.updateRole(id, parseBody(updateRoleSchema, body), user, request);
  }

  @Get('permissions')
  @RequirePermissions('permissions.read')
  listPermissions() {
    return this.internalUsersService.listPermissions();
  }

  @Get(':id')
  @RequirePermissions('users.view_profile')
  getUser(@Param('id') id: string) {
    return this.internalUsersService.getUser(id);
  }
}
