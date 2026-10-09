import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenPayload, InternalAuthUser } from './auth.types';
import { assertCsrfTokenMatches, getAccessTokenFromRequest } from './cookie.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: InternalAuthUser }>();
    const token = getAccessTokenFromRequest(request, 'admin');

    if (!token) {
      throw new UnauthorizedException('Sesion requerida.');
    }

    try {
      assertCsrfTokenMatches(request, 'admin');
    } catch {
      throw new ForbiddenException('Token CSRF invalido.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sesion invalida o expirada.');
    }

    if (payload.type !== 'internal_user') {
      throw new UnauthorizedException('Sesion invalida.');
    }

    const session = await this.prisma.internalSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        internalUser: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  select: { id: true, name: true, description: true, isActive: true },
                },
              },
            },
            directPermissions: {
              include: { permission: true },
            },
            storeAssignments: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion invalida o expirada.');
    }

    const user = session.internalUser;

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo o bloqueado.');
    }

    const activeRoles = user.roleAssignments.map((assignment) => assignment.role).filter((role) => role.isActive);
    const permissions = new Set<string>();

    for (const directPermission of user.directPermissions) {
      permissions.add(directPermission.permission.code);
    }

    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: activeRoles.map((role) => role.name),
      permissions: [...permissions],
      storeIds: user.storeAssignments.map((assignment) => assignment.storeId),
      activeStoreId: session.activeStoreId ?? undefined,
      sessionId: session.id,
      mustChangePassword: user.mustChangePassword,
    };

    return true;
  }
}
