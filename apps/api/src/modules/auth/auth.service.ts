import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { FastifyRequest } from 'fastify';
import { Customer, InternalUser } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import {
  ChangeCustomerPasswordInput,
  ChangeInternalPasswordInput,
  CustomerLoginInput,
  CustomerRegisterInput,
  InternalLoginInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
} from './auth.schemas';
import {
  AccessTokenPayload,
  CustomerAccessTokenPayload,
  CustomerAuthUser,
  CustomerRefreshTokenPayload,
  InternalAuthUser,
  RefreshTokenPayload,
} from './auth.types';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
type PasswordResetTokenPayload = {
  sub: string;
  type: 'internal_password_reset' | 'customer_password_reset';
  email: string;
  passwordHashMarker: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async getCustomerRegistrationOptions() {
    const [brands, stores] = await Promise.all([
      this.prisma.catalogItem.findMany({
        where: { isActive: true, catalog: { code: 'BRANDS', isActive: true } },
        select: { id: true, code: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.store.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, code: true, name: true, address: true, brandId: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { brands, stores };
  }

  async loginInternal(input: InternalLoginInput, request: FastifyRequest) {
    const user = await this.prisma.internalUser.findUnique({
      where: { email: input.email },
      include: this.internalUserInclude,
    });

    if (!user) {
      await this.auditLoginFailure(input.email, 'user_not_found', request);
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    if (user.status !== 'ACTIVE') {
      await this.auditLoginFailure(input.email, 'user_not_active', request, user.id);
      throw new ForbiddenException('Usuario inactivo o bloqueado.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditLoginFailure(input.email, 'user_locked', request, user.id);
      throw new ForbiddenException('Usuario temporalmente bloqueado.');
    }

    const passwordIsValid = await argon2.verify(user.passwordHash, input.password);

    if (!passwordIsValid) {
      await this.registerFailedLogin(user, request);
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    await this.prisma.internalUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    const tokens = await this.issueInternalTokens(user.id, request);
    const profile = await this.getInternalProfile(user.id, tokens.sessionId);

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: user.id,
      action: 'auth.internal.login_success',
      module: 'auth',
      entityType: 'InternalUser',
      entityId: user.id,
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return {
      ...tokens,
      user: profile,
    };
  }

  async refreshInternal(refreshToken: string, request: FastifyRequest) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado.');
    }

    if (payload.type !== 'internal_refresh') {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    const session = await this.prisma.internalSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        internalUser: {
          include: this.internalUserInclude,
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion invalida o expirada.');
    }

    if (session.internalUser.status !== 'ACTIVE') {
      throw new ForbiddenException('Usuario inactivo o bloqueado.');
    }

    const refreshTokenIsValid = await argon2.verify(session.refreshTokenHash, refreshToken);

    if (!refreshTokenIsValid) {
      await this.prisma.internalSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: session.internalUserId,
        action: 'auth.internal.refresh_reuse_detected',
        module: 'auth',
        entityType: 'InternalSession',
        entityId: session.id,
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      });

      throw new UnauthorizedException('Sesion invalida.');
    }

    const tokens = await this.rotateInternalSession(session.id, session.internalUserId, request);
    const profile = await this.getInternalProfile(session.internalUserId, session.id);

    return {
      ...tokens,
      user: profile,
    };
  }

  async logoutInternal(user: InternalAuthUser, request: FastifyRequest) {
    await this.prisma.internalSession.update({
      where: { id: user.sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: user.id,
      action: 'auth.internal.logout',
      module: 'auth',
      entityType: 'InternalSession',
      entityId: user.sessionId,
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async changeInternalPassword(user: InternalAuthUser, input: ChangeInternalPasswordInput, request: FastifyRequest) {
    const internalUser = await this.prisma.internalUser.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true, status: true },
    });

    if (!internalUser || internalUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario invalido.');
    }

    const currentPasswordIsValid = await argon2.verify(internalUser.passwordHash, input.currentPassword);

    if (!currentPasswordIsValid) {
      throw new BadRequestException('La contrasena actual no es correcta.');
    }

    await this.prisma.internalUser.update({
      where: { id: internalUser.id },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: internalUser.id,
      action: 'auth.internal.password_change',
      module: 'auth',
      entityType: 'InternalUser',
      entityId: internalUser.id,
      metadata: { email: internalUser.email },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async requestInternalPasswordReset(input: RequestPasswordResetInput, request: FastifyRequest) {
    const user = await this.prisma.internalUser.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, status: true, passwordHash: true },
    });

    let resetToken: string | null = null;

    if (user?.status === 'ACTIVE') {
      resetToken = await this.createPasswordResetToken({
        sub: user.id,
        type: 'internal_password_reset',
        email: user.email,
        passwordHashMarker: this.passwordHashMarker(user.passwordHash),
      });
    }

    await this.auditService.record({
      actorType: user ? 'INTERNAL_USER' : 'SYSTEM',
      actorInternalUserId: user?.id,
      action: 'auth.internal.password_reset_requested',
      module: 'auth',
      entityType: user ? 'InternalUser' : undefined,
      entityId: user?.id,
      metadata: { email: input.email, issued: Boolean(resetToken), app: input.app ?? 'admin' },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return this.passwordResetRequestResponse(resetToken, this.resolveInternalPasswordResetUrl());
  }

  async resetInternalPassword(input: ResetPasswordInput, request: FastifyRequest) {
    const payload = await this.verifyPasswordResetToken(input.token, 'internal_password_reset');
    const user = await this.prisma.internalUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, passwordHash: true },
    });

    if (!user || user.status !== 'ACTIVE' || this.passwordHashMarker(user.passwordHash) !== payload.passwordHashMarker) {
      throw new UnauthorizedException('El enlace de recuperacion no es valido o ya fue utilizado.');
    }

    await this.prisma.internalUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await this.revokeInternalSessions(user.id);

    await this.auditService.record({
      actorType: 'INTERNAL_USER',
      actorInternalUserId: user.id,
      action: 'auth.internal.password_reset_completed',
      module: 'auth',
      entityType: 'InternalUser',
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async loginCustomer(input: CustomerLoginInput, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: input.email },
    });

    if (!customer) {
      await this.auditCustomerLoginFailure(input.email, 'customer_not_found', request);
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (customer.status !== 'ACTIVE') {
      await this.auditCustomerLoginFailure(input.email, 'customer_not_active', request, customer.id);
      throw new ForbiddenException('Tu cuenta se encuentra inactiva. Comunícate con la tienda para más información.');
    }

    if (!customer.passwordHash) {
      await this.auditCustomerLoginFailure(input.email, 'missing_password_hash', request, customer.id);
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const passwordIsValid = await argon2.verify(customer.passwordHash, input.password);

    if (!passwordIsValid) {
      await this.auditCustomerLoginFailure(input.email, 'invalid_password', request, customer.id);
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const tokens = await this.issueCustomerTokens(customer.id, request);
    const profile = this.toCustomerProfile(customer, tokens.sessionId);

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'auth.customer.login_success',
      module: 'auth',
      entityType: 'Customer',
      entityId: customer.id,
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return {
      ...tokens,
      customer: profile,
    };
  }

  async registerCustomer(input: CustomerRegisterInput, request: FastifyRequest) {
    const duplicate = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { phone: input.phone },
          { email: input.email },
          { taxId: input.taxId },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe una cuenta con ese telefono, correo o NIT.');
    }

    const registration = await this.resolveCustomerRegistration(input);
    const customer = await this.prisma.$transaction(async (tx) => {
      const code = await this.nextCustomerCode(tx);

      return tx.customer.create({
        data: {
          code,
          fullName: resolveCustomerFullName(input),
          phone: input.phone,
          taxId: input.taxId,
          email: input.email,
          passwordHash: await argon2.hash(input.password),
          mustChangePassword: false,
          registrationSource: 'CLIENT_PWA',
          country: 'Guatemala',
          zone: null,
          brand: registration.brand?.name ?? input.brand ?? null,
          brandItemId: registration.brand?.id ?? null,
          registrationStoreId: registration.store?.id ?? null,
          reference: null,
        },
      });
    });

    const tokens = await this.issueCustomerTokens(customer.id, request);
    const profile = this.toCustomerProfile(customer, tokens.sessionId);

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'auth.customer.register',
      module: 'auth',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { code: customer.code, registrationSource: 'CLIENT_PWA' },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return {
      ...tokens,
      customer: profile,
    };
  }

  async refreshCustomer(refreshToken: string, request: FastifyRequest) {
    let payload: CustomerRefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<CustomerRefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token de cliente invalido o expirado.');
    }

    if (payload.type !== 'customer_refresh') {
      throw new UnauthorizedException('Refresh token de cliente invalido.');
    }

    const session = await this.prisma.customerSession.findUnique({
      where: { id: payload.sessionId },
      include: { customer: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sesion de cliente invalida o expirada.');
    }

    if (session.customer.status !== 'ACTIVE') {
      throw new ForbiddenException('Cliente inactivo o bloqueado.');
    }

    const refreshTokenIsValid = await argon2.verify(session.refreshTokenHash, refreshToken);

    if (!refreshTokenIsValid) {
      await this.prisma.customerSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        actorType: 'CUSTOMER',
        actorCustomerId: session.customerId,
        action: 'auth.customer.refresh_reuse_detected',
        module: 'auth',
        entityType: 'CustomerSession',
        entityId: session.id,
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      });

      throw new UnauthorizedException('Sesion de cliente invalida.');
    }

    const tokens = await this.rotateCustomerSession(session.id, session.customerId, request);

    return {
      ...tokens,
      customer: this.toCustomerProfile(session.customer, session.id),
    };
  }

  async logoutCustomer(customer: CustomerAuthUser, request: FastifyRequest) {
    await this.prisma.customerSession.update({
      where: { id: customer.sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'auth.customer.logout',
      module: 'auth',
      entityType: 'CustomerSession',
      entityId: customer.sessionId,
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async changeCustomerPassword(customer: CustomerAuthUser, input: ChangeCustomerPasswordInput, request: FastifyRequest) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      select: { id: true, code: true, status: true },
    });

    if (!existingCustomer || existingCustomer.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cliente invalido.');
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        mustChangePassword: false,
      },
    });

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'auth.customer.password_change',
      module: 'auth',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { code: existingCustomer.code },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async requestCustomerPasswordReset(input: RequestPasswordResetInput, request: FastifyRequest) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, status: true, passwordHash: true },
    });

    let resetToken: string | null = null;

    if (customer?.status === 'ACTIVE' && customer.passwordHash) {
      resetToken = await this.createPasswordResetToken({
        sub: customer.id,
        type: 'customer_password_reset',
        email: customer.email ?? input.email,
        passwordHashMarker: this.passwordHashMarker(customer.passwordHash),
      });
    }

    await this.auditService.record({
      actorType: customer ? 'CUSTOMER' : 'SYSTEM',
      actorCustomerId: customer?.id,
      action: 'auth.customer.password_reset_requested',
      module: 'auth',
      entityType: customer ? 'Customer' : undefined,
      entityId: customer?.id,
      metadata: { email: input.email, issued: Boolean(resetToken) },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return this.passwordResetRequestResponse(resetToken, this.resolveFrontendUrl('CLIENT_PWA_URL', 'http://localhost:3002'));
  }

  async resetCustomerPassword(input: ResetPasswordInput, request: FastifyRequest) {
    const payload = await this.verifyPasswordResetToken(input.token, 'customer_password_reset');
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, code: true, status: true, passwordHash: true },
    });

    if (!customer || customer.status !== 'ACTIVE' || !customer.passwordHash || this.passwordHashMarker(customer.passwordHash) !== payload.passwordHashMarker) {
      throw new UnauthorizedException('El enlace de recuperacion no es valido o ya fue utilizado.');
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await argon2.hash(input.newPassword),
        mustChangePassword: false,
      },
    });

    await this.revokeCustomerSessions(customer.id);

    await this.auditService.record({
      actorType: 'CUSTOMER',
      actorCustomerId: customer.id,
      action: 'auth.customer.password_reset_completed',
      module: 'auth',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { code: customer.code, email: customer.email },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });

    return { ok: true };
  }

  async getInternalProfile(userId: string, sessionId: string): Promise<InternalAuthUser> {
    const user = await this.prisma.internalUser.findUnique({
      where: { id: userId },
      include: this.internalUserInclude,
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario invalido.');
    }

    const activeRoles = user.roleAssignments.map((assignment) => assignment.role).filter((role) => role.isActive);
    const permissions = new Set<string>();

    for (const directPermission of user.directPermissions) {
      permissions.add(directPermission.permission.code);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      profilePhotoUrl: user.profilePhotoUrl,
      roles: activeRoles.map((role) => role.name),
      permissions: [...permissions],
      storeIds: user.storeAssignments.map((assignment) => assignment.storeId),
      stores: user.storeAssignments.map((assignment) => ({
        id: assignment.storeId,
        code: assignment.store.code,
        name: assignment.store.name,
      })),
      activeStoreId: await this.getSessionActiveStoreId(sessionId),
      sessionId,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private async getSessionActiveStoreId(sessionId: string) {
    const session = await this.prisma.internalSession.findUnique({
      where: { id: sessionId },
      select: { activeStoreId: true },
    });

    return session?.activeStoreId ?? undefined;
  }

  private async registerFailedLogin(user: InternalUser, request: FastifyRequest) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;

    await this.prisma.internalUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil,
      },
    });

    await this.auditLoginFailure(user.email, shouldLock ? 'invalid_password_user_locked' : 'invalid_password', request, user.id);
  }

  private async auditLoginFailure(
    email: string,
    reason: string,
    request: FastifyRequest,
    internalUserId?: string,
  ) {
    await this.auditService.record({
      actorType: internalUserId ? 'INTERNAL_USER' : 'SYSTEM',
      actorInternalUserId: internalUserId,
      action: 'auth.internal.login_failed',
      module: 'auth',
      entityType: internalUserId ? 'InternalUser' : undefined,
      entityId: internalUserId,
      metadata: { email, reason },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });
  }

  private async auditCustomerLoginFailure(
    code: string,
    reason: string,
    request: FastifyRequest,
    customerId?: string,
  ) {
    await this.auditService.record({
      actorType: customerId ? 'CUSTOMER' : 'SYSTEM',
      actorCustomerId: customerId,
      action: 'auth.customer.login_failed',
      module: 'auth',
      entityType: customerId ? 'Customer' : undefined,
      entityId: customerId,
      metadata: { code, reason },
      ipAddress: this.getIpAddress(request),
      userAgent: this.getUserAgent(request),
    });
  }

  private async issueInternalTokens(internalUserId: string, request: FastifyRequest) {
    const session = await this.prisma.internalSession.create({
      data: {
        internalUserId,
        activeStoreId: await this.resolveDefaultActiveStoreId(internalUserId),
        refreshTokenHash: 'pending',
        expiresAt: this.getRefreshExpiresAt(),
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      },
    });

    return this.rotateInternalSession(session.id, internalUserId, request);
  }

  private async rotateInternalSession(sessionId: string, internalUserId: string, request: FastifyRequest) {
    const accessPayload: AccessTokenPayload = {
      sub: internalUserId,
      type: 'internal_user',
      sessionId,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: internalUserId,
      type: 'internal_refresh',
      sessionId,
    };

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

    await this.prisma.internalSession.update({
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

  private async issueCustomerTokens(customerId: string, request: FastifyRequest) {
    const session = await this.prisma.customerSession.create({
      data: {
        customerId,
        refreshTokenHash: 'pending',
        expiresAt: this.getRefreshExpiresAt(),
        ipAddress: this.getIpAddress(request),
        userAgent: this.getUserAgent(request),
      },
    });

    return this.rotateCustomerSession(session.id, customerId, request);
  }

  private async rotateCustomerSession(sessionId: string, customerId: string, request: FastifyRequest) {
    const accessPayload: CustomerAccessTokenPayload = {
      sub: customerId,
      type: 'customer',
      sessionId,
    };
    const refreshPayload: CustomerRefreshTokenPayload = {
      sub: customerId,
      type: 'customer_refresh',
      sessionId,
    };

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

    await this.prisma.customerSession.update({
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

  private async nextCustomerCode(tx: { customerCodeSequence: { upsert: (args: { where: { id: number }; update: { nextValue: { increment: number } }; create: { id: number; nextValue: number } }) => Promise<{ nextValue: number }> } }) {
    const sequence = await tx.customerCodeSequence.upsert({
      where: { id: 1 },
      update: { nextValue: { increment: 1 } },
      create: { id: 1, nextValue: 2 },
    });

    return `RMT-${String(sequence.nextValue - 1).padStart(6, '0')}`;
  }

  private async resolveCustomerRegistration(input: CustomerRegisterInput) {
    const [selectedBrand, selectedStore] = await Promise.all([
      input.brandItemId
        ? this.prisma.catalogItem.findFirst({
            where: { id: input.brandItemId, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
            select: { id: true, name: true },
          })
        : input.brand
          ? this.prisma.catalogItem.findFirst({
              where: { name: { equals: input.brand, mode: 'insensitive' }, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
              select: { id: true, name: true },
            })
          : null,
      input.registrationStoreId
        ? this.prisma.store.findFirst({
            where: { id: input.registrationStoreId, status: 'ACTIVE' },
            select: { id: true, brandId: true },
          })
        : input.storeName
          ? this.prisma.store.findFirst({
              where: { name: { equals: input.storeName, mode: 'insensitive' }, status: 'ACTIVE' },
              select: { id: true, brandId: true },
            })
          : null,
    ]);

    if ((input.brandItemId || input.brand) && !selectedBrand) {
      throw new BadRequestException('La marca seleccionada no es valida o esta inactiva.');
    }
    if ((input.registrationStoreId || input.storeName) && !selectedStore) {
      throw new BadRequestException('La tienda seleccionada no es valida o esta inactiva.');
    }

    let brand = selectedBrand;
    if (!brand && selectedStore?.brandId) {
      brand = await this.prisma.catalogItem.findFirst({
        where: { id: selectedStore.brandId, isActive: true, catalog: { code: 'BRANDS', isActive: true } },
        select: { id: true, name: true },
      });
    }

    if (brand && selectedStore?.brandId && selectedStore.brandId !== brand.id) {
      throw new BadRequestException('La tienda seleccionada no pertenece a la marca elegida.');
    }

    return { brand, store: selectedStore };
  }

  private async createPasswordResetToken(payload: PasswordResetTokenPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('PASSWORD_RESET_EXPIRES_IN') ?? '30m') as never,
    });
  }

  private async verifyPasswordResetToken(token: string, expectedType: PasswordResetTokenPayload['type']) {
    try {
      const payload = await this.jwtService.verifyAsync<PasswordResetTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== expectedType) {
        throw new UnauthorizedException('El enlace de recuperacion no es valido.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('El enlace de recuperacion expiro o no es valido.');
    }
  }

  private passwordResetRequestResponse(resetToken: string | null, frontendUrl: string) {
    const response: { ok: true; message: string; resetToken?: string; resetUrl?: string } = {
      ok: true,
      message: 'Si existe una cuenta activa con ese correo, se generara un enlace de recuperacion.',
    };

    if (resetToken && this.configService.get<string>('APP_ENV') !== 'production') {
      response.resetToken = resetToken;
      response.resetUrl = `${frontendUrl.replace(/\/$/, '')}/recuperar-contrasena?token=${encodeURIComponent(resetToken)}`;
    }

    return response;
  }

  private passwordHashMarker(passwordHash: string) {
    return passwordHash.slice(-24);
  }

  private resolveFrontendUrl(envName: string, fallback: string) {
    return this.configService.get<string>(envName) ?? fallback;
  }

  private resolveInternalPasswordResetUrl() {
    return this.resolveFrontendUrl('ADMIN_WEB_URL', 'http://localhost:3000');
  }

  private async revokeInternalSessions(internalUserId: string) {
    await this.prisma.internalSession.updateMany({
      where: { internalUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeCustomerSessions(customerId: string) {
    await this.prisma.customerSession.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toCustomerProfile(customer: Customer, sessionId: string): CustomerAuthUser {
    return {
      id: customer.id,
      code: customer.code,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      profilePhotoUrl: customer.profilePhotoUrl,
      status: customer.status,
      sessionId,
      mustChangePassword: customer.mustChangePassword,
    };
  }

  private getRefreshExpiresAt() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.getRefreshExpiresInDays());
    return expiresAt;
  }

  private getRefreshExpiresInDays() {
    const rawValue = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '30';
    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 90) {
      throw new BadRequestException('JWT_REFRESH_EXPIRES_IN_DAYS debe estar entre 1 y 90.');
    }

    return parsedValue;
  }

  private getIpAddress(request: FastifyRequest) {
    return request.ip;
  }

  private getUserAgent(request: FastifyRequest) {
    return request.headers['user-agent'];
  }

  private async resolveDefaultActiveStoreId(internalUserId: string) {
    const assignments = await this.prisma.userStore.findMany({
      where: {
        userId: internalUserId,
        store: { status: 'ACTIVE' },
      },
      select: { storeId: true },
    });

    return assignments.length === 1 ? assignments[0].storeId : undefined;
  }

  private readonly internalUserInclude = {
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
    storeAssignments: {
      include: {
        store: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  } as const;
}

function resolveCustomerFullName(input: CustomerRegisterInput) {
  if (input.fullName?.trim()) return input.fullName.trim();
  return `${input.firstName ?? ''} ${input.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
}
