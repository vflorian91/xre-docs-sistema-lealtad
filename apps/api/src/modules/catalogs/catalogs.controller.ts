import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import {
  createCatalogItemSchema,
  createCatalogSchema,
  updateCatalogItemSchema,
  updateCatalogSchema,
} from './catalog.schemas';
import { CatalogsService } from './catalogs.service';

@Controller('catalogs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @RequirePermissions('catalogs.read')
  list(@Query('includeInactive') includeInactive?: string) {
    return this.catalogsService.listCatalogs(includeInactive === 'true');
  }

  @Post()
  @RequirePermissions('catalogs.manage')
  create(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.catalogsService.createCatalog(parseBody(createCatalogSchema, body), user, request);
  }

  @Get('zones/autocomplete')
  @RequirePermissions('catalogs.read')
  autocompleteZones(
    @Query('q') query = '',
    @Query('countryId') countryId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('municipalityId') municipalityId?: string,
  ) {
    return this.catalogsService.autocompleteZones(query, { countryId, departmentId, municipalityId });
  }

  @Get(':code')
  @RequirePermissions('catalogs.read')
  getByCode(
    @Param('code') code: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('parentItemId') parentItemId?: string,
  ) {
    return this.catalogsService.getCatalog(code, includeInactive === 'true', parentItemId);
  }

  @Patch(':code')
  @RequirePermissions('catalogs.manage')
  update(@Param('code') code: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.catalogsService.updateCatalog(code, parseBody(updateCatalogSchema, body), user, request);
  }

  @Post(':code/items')
  @RequirePermissions('catalogs.manage')
  createItem(@Param('code') code: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.catalogsService.createItem(code, parseBody(createCatalogItemSchema, body), user, request);
  }

  @Patch('items/:itemId')
  @RequirePermissions('catalogs.manage')
  updateItem(@Param('itemId') itemId: string, @Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.catalogsService.updateItem(itemId, parseBody(updateCatalogItemSchema, body), user, request);
  }
}
