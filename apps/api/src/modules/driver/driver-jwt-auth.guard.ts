import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import { DriverAccessTokenPayload, DriverAuthUser } from '../auth/auth.types';
import { assertCsrfTokenMatches, getAccessTokenFromRequest } from '../auth/cookie.util';
import { DRIVER_ACCESS_STATUS } from './driver.schemas';

@Injectable()
export class DriverJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { driver?: DriverAuthUser }>();
    const token = getAccessTokenFromRequest(request, 'driver');

    if (!token) {
      throw new UnauthorizedException('Sesion de mensajero requerida.');
    }

    try {
      assertCsrfTokenMatches(request, 'driver');
    } catch {
      throw new ForbiddenException('Token CSRF invalido.');
    }

    let payload: DriverAccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<DriverAccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sesion de mensajero invalida o expirada.');
    }

    if (payload.type !== 'driver') {
      throw new UnauthorizedException('Sesion de mensajero invalida.');
    }

    const session = await this.prisma.storeDriverSession.findUnique({
      where: { id: payload.sessionId },
      include: { driver: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion de mensajero invalida o expirada.');
    }

    if (!session.driver.isActive || ![DRIVER_ACCESS_STATUS.ACTIVO, DRIVER_ACCESS_STATUS.PENDIENTE_PRIMER_INGRESO].includes(session.driver.accessStatus as never)) {
      throw new UnauthorizedException('Mensajero inactivo o sin acceso.');
    }

    request.driver = {
      id: session.driver.id,
      fullName: session.driver.fullName,
      phone: session.driver.phone,
      email: session.driver.email,
      code: session.driver.code,
      accessStatus: session.driver.accessStatus,
      isActive: session.driver.isActive,
      sessionId: session.id,
      mustChangePassword: session.driver.mustChangePassword,
    };

    return true;
  }
}
