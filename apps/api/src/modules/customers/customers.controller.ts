import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { createCustomerSchema, listCustomersSchema, searchCustomersSchema, updateCustomerSchema } from './customer.schemas';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customers.read')
  search(@Query() query: unknown, @CurrentUser() user: InternalAuthUser) {
    const parsedQuery = query as Record<string, unknown>;
    if (
      'page' in parsedQuery
      || 'limit' in parsedQuery
      || 'search' in parsedQuery
      || 'level' in parsedQuery
      || 'origin' in parsedQuery
      || 'exportAll' in parsedQuery
    ) {
      return this.customersService.list(parseBody(listCustomersSchema, query), user);
    }

    return this.customersService.search(parseBody(searchCustomersSchema, query), user);
  }

  @Post()
  @RequirePermissions('customers.create')
  createFromAdmin(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.customersService.createFromAdmin(parseBody(createCustomerSchema, body), user, request);
  }

  @Post('quick')
  @RequirePermissions('customers.create')
  createQuickFromStore(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.customersService.createQuickFromStore(parseBody(createCustomerSchema, body), user, request);
  }

  @Get(':id')
  @RequirePermissions('customers.view_profile')
  getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }

  @Get(':id/profile')
  @RequirePermissions('customers.view_profile')
  getProfile(@Param('id') id: string) {
    return this.customersService.getProfile(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.customersService.update(id, parseBody(updateCustomerSchema, body), user, request);
  }
}
