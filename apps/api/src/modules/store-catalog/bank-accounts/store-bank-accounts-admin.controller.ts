import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/require-permissions.decorator';
import { parseBody } from '../../common/parse-body';
import { StoreBankAccountsService } from './store-bank-accounts.service';
import { createBankAccountSchema, updateBankAccountSchema } from './store-bank-account.schemas';

@Controller('admin/store/bank-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreBankAccountsAdminController {
  constructor(private readonly service: StoreBankAccountsService) {}

  @Get()
  @RequirePermissions('store_orders.payments')
  list() {
    return this.service.listAll();
  }

  @Post()
  @RequirePermissions('store_orders.payments')
  create(@Body() body: unknown) {
    return this.service.create(parseBody(createBankAccountSchema, body));
  }

  @Patch(':id')
  @RequirePermissions('store_orders.payments')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(id, parseBody(updateBankAccountSchema, body));
  }

  @Patch(':id/activate')
  @RequirePermissions('store_orders.payments')
  activate(@Param('id') id: string) {
    return this.service.setActive(id, true);
  }

  @Patch(':id/inactivate')
  @RequirePermissions('store_orders.payments')
  inactivate(@Param('id') id: string) {
    return this.service.setActive(id, false);
  }
}
