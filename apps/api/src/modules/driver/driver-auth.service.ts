import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import { DriverAccessTokenPayload, DriverAuthUser, DriverRefreshTokenPayload } from '../auth/auth.types';
import { ChangeDriverPasswordInput, DRIVER_ACCESS_STATUS, DriverLoginInput } from './driver.schemas';

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(input: DriverLoginInput, request: FastifyRequest) {
    const driver = await this.prisma.storeDriver.findUnique({ where: { email: input.email } });
    if (!driver || !driver.passwordHash) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    this.assertDriverCanLogin(driver);

    const passwordIsValid = await argon2.verify(driver.passwordHash, input.password);
    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    await this.prisma.storeDriver.update({
      where: { id: driver.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(driver.id, request);
    const profile = await this.getProfile(driver.id, tokens.sessionId);
    return { ...tokens, driver: profile };
  }

  async changePassword(driver: DriverAuthUser, input: ChangeDriverPasswordInput) {
    const updated = await this.prisma.storeDriver.update({
      where: { id: driver.id },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        mustChangePassword: false,
        accessStatus: DRIVER_ACCESS_STATUS.ACTIVO,
      },
    });

    return { ok: true, driver: this.toDriverProfile(updated, driver.sessionId) };
  }

  async me(driver: DriverAuthUser) {
    const current = await this.prisma.storeDriver.findUnique({ where: { id: driver.id } });
    if (!current) throw new UnauthorizedException('Mensajero invalido.');
    this.assertDriverCanLogin(current);
    return { driver: this.toDriverProfile(current, driver.sessionId) };
  }

  async logout(driver: DriverAuthUser) {
    await this.prisma.storeDriverSession.updateMany({
      where: { id: driver.sessionId, driverId: driver.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private assertDriverCanLogin(driver: { isActive: boolean; accessStatus: string }) {
    if (!driver.isActive) {
      throw new ForbiddenException('Mensajero inactivo.');
    }
    if (![DRIVER_ACCESS_STATUS.ACTIVO, DRIVER_ACCESS_STATUS.PENDIENTE_PRIMER_INGRESO].includes(driver.accessStatus as never)) {
      throw new ForbiddenException('Acceso de mensajero bloqueado o inactivo.');
    }
  }

  private async issueTokens(driverId: string, request: FastifyRequest) {
    const session = await this.prisma.storeDriverSession.create({
      data: {
        driverId,
        refreshTokenHash: 'pending',
        expiresAt: this.getRefreshExpiresAt(),
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      },
    });

    return this.rotateSession(session.id, driverId, request);
  }

  private async rotateSession(sessionId: string, driverId: string, request: FastifyRequest) {
    const accessPayload: DriverAccessTokenPayload = { sub: driverId, type: 'driver', sessionId };
    const refreshPayload: DriverRefreshTokenPayload = { sub: driverId, type: 'driver_refresh', sessionId };
    const refreshExpiresAt = this.getRefreshExpiresAt();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as never,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${this.getRefreshExpiresInDays()}d` as never,
      }),
    ]);

    await this.prisma.storeDriverSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: await argon2.hash(refreshToken),
        expiresAt: refreshExpiresAt,
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      },
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    };
  }

  private async getProfile(driverId: string, sessionId: string) {
    const driver = await this.prisma.storeDriver.findUnique({ where: { id: driverId } });
    if (!driver) throw new UnauthorizedException('Mensajero invalido.');
    return this.toDriverProfile(driver, sessionId);
  }

  private toDriverProfile(driver: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    code: string | null;
    accessStatus: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }, sessionId: string): DriverAuthUser {
    return {
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone,
      email: driver.email,
      code: driver.code,
      accessStatus: driver.accessStatus,
      isActive: driver.isActive,
      sessionId,
      mustChangePassword: driver.mustChangePassword,
    };
  }

  private getRefreshExpiresInDays() {
    return Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '30');
  }

  private getRefreshExpiresAt() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.getRefreshExpiresInDays());
    return expiresAt;
  }

  private getIpAddress(request: FastifyRequest) {
    return request.ip ?? request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
  }

  private getUserAgent(request: FastifyRequest) {
    return request.headers['user-agent']?.toString();
  }
}
