import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import { CustomerAccessTokenPayload, CustomerAuthUser } from './auth.types';
import { assertCsrfTokenMatches, getAccessTokenFromRequest } from './cookie.util';

@Injectable()
export class CustomerJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { customer?: CustomerAuthUser }>();
    const token = getAccessTokenFromRequest(request, 'client');

    if (!token) {
      throw new UnauthorizedException('Sesion de cliente requerida.');
    }

    try {
      assertCsrfTokenMatches(request, 'client');
    } catch {
      throw new ForbiddenException('Token CSRF invalido.');
    }

    let payload: CustomerAccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<CustomerAccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sesion de cliente invalida o expirada.');
    }

    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Sesion de cliente invalida.');
    }

    const session = await this.prisma.customerSession.findUnique({
      where: { id: payload.sessionId },
      include: { customer: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion de cliente invalida o expirada.');
    }

    if (session.customer.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cliente inactivo o bloqueado.');
    }

    request.customer = {
      id: session.customer.id,
      code: session.customer.code,
      fullName: session.customer.fullName,
      phone: session.customer.phone,
      email: session.customer.email,
      status: session.customer.status,
      brandItemId: session.customer.brandItemId,
      sessionId: session.id,
      mustChangePassword: session.customer.mustChangePassword,
    };

    return true;
  }
}
