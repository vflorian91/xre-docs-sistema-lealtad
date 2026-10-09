import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InternalAuthUser } from '../auth/auth.types';
import { parseBody } from '../common/parse-body';
import { settingKeySchema, updateSettingSchema } from './settings.schemas';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  listSettings() {
    return this.settingsService.listSettings();
  }

  @Get(':key')
  @RequirePermissions('settings.read')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(settingKeySchema.parse(key));
  }

  @Patch(':key')
  @RequirePermissions('settings.manage')
  updateSetting(
    @Param('key') key: string,
    @Body() body: unknown,
    @CurrentUser() user: InternalAuthUser,
    @Req() request: FastifyRequest,
  ) {
    return this.settingsService.updateSetting(parseBody(updateSettingSchema, { key, value: body }), user, request);
  }
}
