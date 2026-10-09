import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../auth/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../auth/customer-jwt-auth.guard';
import { CustomerAuthUser } from '../auth/auth.types';
import { ClientService } from './client.service';
import { FastifyRequest } from 'fastify';
import { parseBody } from '../common/parse-body';
import { scanInvoiceQrSchema, updateClientProfileSchema } from './client.schemas';

@Controller('client')
@UseGuards(CustomerJwtAuthGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('summary')
  summary(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.clientService.getSummary(customer);
  }

  @Get('purchases')
  purchases(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.clientService.getPurchases(customer);
  }

  @Get('points')
  points(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.clientService.getPointMovements(customer);
  }

  @Get('profile')
  profile(@CurrentCustomer() customer: CustomerAuthUser) {
    return this.clientService.getProfile(customer);
  }

  @Patch('profile')
  updateProfile(@CurrentCustomer() customer: CustomerAuthUser, @Body() body: unknown, @Req() request: FastifyRequest) {
    return this.clientService.updateProfile(customer, parseBody(updateClientProfileSchema, body), request);
  }

  @Post('invoice-qr')
  scanInvoiceQr(@CurrentCustomer() customer: CustomerAuthUser, @Body() body: unknown, @Req() request: FastifyRequest) {
    return this.clientService.registerInvoiceQr(customer, parseBody(scanInvoiceQrSchema, body), request);
  }

  @Get('catalogs/:code')
  catalogItems(@Param('code') code: string, @Query('parentItemId') parentItemId?: string) {
    return this.clientService.getCatalogItems(code, parentItemId);
  }
}
