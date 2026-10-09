import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { parseBody } from '../common/parse-body';
import { CurrentUser } from './current-user.decorator';
import { CurrentCustomer } from './current-customer.decorator';
import { CustomerJwtAuthGuard } from './customer-jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';
import {
  changeCustomerPasswordSchema,
  changeInternalPasswordSchema,
  customerLoginSchema,
  customerRegisterSchema,
  internalLoginSchema,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from './auth.schemas';
import { CustomerAuthUser, InternalAuthUser } from './auth.types';
import { clearAuthCookies, getRefreshTokenFromRequest, parseDurationToSeconds, setAuthCookies } from './cookie.util';

@Controller('auth/internal')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieMaxAges() {
    return {
      accessMaxAgeSeconds: parseDurationToSeconds(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'), 15 * 60),
      refreshMaxAgeSeconds: Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '30') * 86400,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = parseBody(internalLoginSchema, body);
    const { accessToken, refreshToken, user } = await this.authService.loginInternal(input, request);
    setAuthCookies(reply, 'admin', { accessToken, refreshToken }, this.cookieMaxAges());
    return { user };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = parseBody(refreshTokenSchema.partial().optional(), body) ?? {};
    const refreshToken = getRefreshTokenFromRequest(request, 'admin', input.refreshToken);
    if (!refreshToken) {
      clearAuthCookies(reply, 'admin');
      throw new UnauthorizedException('Refresh token no proporcionado.');
    }
    const { accessToken, refreshToken: nextRefreshToken, user } = await this.authService.refreshInternal(refreshToken, request);
    setAuthCookies(reply, 'admin', { accessToken, refreshToken: nextRefreshToken }, this.cookieMaxAges());
    return { user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: InternalAuthUser) {
    return { user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.logoutInternal(user, request);
    clearAuthCookies(reply, 'admin');
    return result;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() body: unknown, @CurrentUser() user: InternalAuthUser, @Req() request: FastifyRequest) {
    return this.authService.changeInternalPassword(user, parseBody(changeInternalPasswordSchema, body), request);
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestPasswordReset(@Body() body: unknown, @Req() request: FastifyRequest) {
    return this.authService.requestInternalPasswordReset(parseBody(requestPasswordResetSchema, body), request);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() body: unknown, @Req() request: FastifyRequest) {
    return this.authService.resetInternalPassword(parseBody(resetPasswordSchema, body), request);
  }

  @Get('permissions-check')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('audit.read')
  permissionsCheck(@CurrentUser() user: InternalAuthUser) {
    return {
      ok: true,
      checkedPermission: 'audit.read',
      userId: user.id,
    };
  }
}

@Controller('auth/customer')
export class CustomerAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieMaxAges() {
    return {
      accessMaxAgeSeconds: parseDurationToSeconds(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'), 15 * 60),
      refreshMaxAgeSeconds: Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '30') * 86400,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = parseBody(customerLoginSchema, body);
    const { accessToken, refreshToken, customer } = await this.authService.loginCustomer(input, request);
    setAuthCookies(reply, 'client', { accessToken, refreshToken }, this.cookieMaxAges());
    return { customer };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = parseBody(customerRegisterSchema, body);
    const { accessToken, refreshToken, customer } = await this.authService.registerCustomer(input, request);
    setAuthCookies(reply, 'client', { accessToken, refreshToken }, this.cookieMaxAges());
    return { customer };
  }

  @Get('registration-options')
  registrationOptions() {
    return this.authService.getCustomerRegistrationOptions();
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = parseBody(refreshTokenSchema.partial().optional(), body) ?? {};
    const refreshToken = getRefreshTokenFromRequest(request, 'client', input.refreshToken);
    if (!refreshToken) {
      clearAuthCookies(reply, 'client');
      throw new UnauthorizedException('Refresh token no proporcionado.');
    }
    const { accessToken, refreshToken: nextRefreshToken, customer } = await this.authService.refreshCustomer(refreshToken, request);
    setAuthCookies(reply, 'client', { accessToken, refreshToken: nextRefreshToken }, this.cookieMaxAges());
    return { customer };
  }

  @Get('me')
  @UseGuards(CustomerJwtAuthGuard)
  me(@CurrentCustomer() customer: CustomerAuthUser) {
    return { customer };
  }

  @Post('logout')
  @UseGuards(CustomerJwtAuthGuard)
  async logout(@CurrentCustomer() customer: CustomerAuthUser, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.logoutCustomer(customer, request);
    clearAuthCookies(reply, 'client');
    return result;
  }

  @Post('change-password')
  @UseGuards(CustomerJwtAuthGuard)
  changePassword(@Body() body: unknown, @CurrentCustomer() customer: CustomerAuthUser, @Req() request: FastifyRequest) {
    return this.authService.changeCustomerPassword(customer, parseBody(changeCustomerPasswordSchema, body), request);
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  requestPasswordReset(@Body() body: unknown, @Req() request: FastifyRequest) {
    return this.authService.requestCustomerPasswordReset(parseBody(requestPasswordResetSchema, body), request);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() body: unknown, @Req() request: FastifyRequest) {
    return this.authService.resetCustomerPassword(parseBody(resetPasswordSchema, body), request);
  }
}
