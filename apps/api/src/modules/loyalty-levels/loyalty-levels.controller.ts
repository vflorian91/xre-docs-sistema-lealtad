import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { parseBody } from '../common/parse-body';
import { createLoyaltyLevelTierSchema, updateLoyaltyLevelTierSchema } from './loyalty-level.schemas';
import { LoyaltyLevelsService } from './loyalty-levels.service';

@Controller('loyalty-levels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoyaltyLevelsController {
  constructor(private readonly loyaltyLevelsService: LoyaltyLevelsService) {}

  @Get()
  @RequirePermissions('settings.read')
  list(@Query('includeInactive') includeInactive?: string) {
    return this.loyaltyLevelsService.listTiers(includeInactive === 'true');
  }

  @Post()
  @RequirePermissions('settings.manage')
  create(@Body() body: unknown) {
    return this.loyaltyLevelsService.createTier(parseBody(createLoyaltyLevelTierSchema, body));
  }

  @Patch(':id')
  @RequirePermissions('settings.manage')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.loyaltyLevelsService.updateTier(id, parseBody(updateLoyaltyLevelTierSchema, body));
  }
}
