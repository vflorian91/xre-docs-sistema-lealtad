import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentDriver } from '../auth/current-driver.decorator';
import { DriverAuthUser } from '../auth/auth.types';
import { clearAuthCookies, parseDurationToSeconds, setAuthCookies } from '../auth/cookie.util';
import { parseBody } from '../common/parse-body';
import { changeDriverPasswordSchema, driverLoginSchema } from './driver.schemas';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtAuthGuard } from './driver-jwt-auth.guard';

@Controller('driver/auth')
export class DriverAuthController {
  constructor(
    private readonly driverAuthService: DriverAuthService,
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
    const input = parseBody(driverLoginSchema, body);
    const { accessToken, refreshToken, driver } = await this.driverAuthService.login(input, request);
    setAuthCookies(reply, 'driver', { accessToken, refreshToken }, input.rememberMe ? this.cookieMaxAges() : {});
    return { driver };
  }

  @Get('me')
  @UseGuards(DriverJwtAuthGuard)
  me(@CurrentDriver() driver: DriverAuthUser) {
    return this.driverAuthService.me(driver);
  }

  @Post('change-password')
  @UseGuards(DriverJwtAuthGuard)
  changePassword(@Body() body: unknown, @CurrentDriver() driver: DriverAuthUser) {
    return this.driverAuthService.changePassword(driver, parseBody(changeDriverPasswordSchema, body));
  }

  @Post('logout')
  @UseGuards(DriverJwtAuthGuard)
  async logout(@CurrentDriver() driver: DriverAuthUser, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.driverAuthService.logout(driver);
    clearAuthCookies(reply, 'driver');
    return result;
  }
}
