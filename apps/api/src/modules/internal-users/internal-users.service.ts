import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { FastifyRequest } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { InternalAuthUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateInternalUserInput, CreateRoleInput, UpdateInternalUserInput, UpdateInternalUserPermissionsInput, UpdateRoleInput } from './internal-user.schemas';

@Injectable()
export class InternalUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers() {
    return this.prisma.internalUser.findMany({
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        roleAssignments: {
          include: { role: true },
        },
        directPermissions: {
          include: { permission: true },
        },
        storeAssignments: {
          include: { store: true },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async listRoles(includeInactive = false) {
    return this.prisma.role.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async createRole(input: CreateRoleInput, actor: InternalAuthUser, request: FastifyRequest) {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          isSystem: false,
          isActive: true,
        },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'roles.create',
        module: 'roles',
        entityType: 'Role',
        entityId: role.id,
        metadata: { name: role.name },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return role;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un rol con ese nombre.');
      }

      throw error;
    }
  }

  async updateRole(id: string, input: UpdateRoleInput, actor: InternalAuthUser, request: FastifyRequest) {
    const existingRole = await this.prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      throw new NotFoundException('Rol no encontrado.');
    }

    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          isActive: input.isActive,
        },
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'roles.update',
        module: 'roles',
        entityType: 'Role',
        entityId: role.id,
        metadata: { before: existingRole, after: role },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return role;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un rol con ese nombre.');
      }

      throw error;
    }
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }, { code: 'asc' }],
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.internalUser.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        paisItemId: true,
        departamentoItemId: true,
        municipioItemId: true,
        zonaItemId: true,
        paisItem: { select: { id: true, name: true } },
        departamentoItem: { select: { id: true, name: true } },
        municipioItem: { select: { id: true, name: true } },
        zonaItem: { select: { id: true, name: true } },
        roleAssignments: {
          include: { role: true },
        },
        directPermissions: {
          include: { permission: true },
        },
        storeAssignments: {
          include: { store: true },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, updatedAt: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario interno no encontrado.');
    }

    return user;
  }

  async createUser(input: CreateInternalUserInput, actor: InternalAuthUser, request: FastifyRequest) {
    this.assertSingleStoreAssignment(input.storeIds);

    const [roles, stores, permissions] = await Promise.all([
      this.prisma.role.findMany({ where: { id: { in: input.roleIds }, isActive: true } }),
      this.prisma.store.findMany({ where: { id: { in: input.storeIds }, status: 'ACTIVE' } }),
      this.prisma.permission.findMany({ where: { code: { in: input.permissionCodes } } }),
    ]);

    if (roles.length !== input.roleIds.length) {
      throw new BadRequestException('Uno o mas roles no existen o estan inactivos.');
    }

    if (stores.length !== input.storeIds.length) {
      throw new BadRequestException('Una o mas tiendas no existen o estan inactivas.');
    }
    if (permissions.length !== input.permissionCodes.length) {
      throw new BadRequestException('Uno o mas permisos no existen.');
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.internalUser.create({
          data: {
            fullName: input.fullName,
            email: input.email,
            passwordHash: await argon2.hash(input.password),
            mustChangePassword: input.mustChangePassword,
            paisItemId: input.paisItemId ?? null,
            departamentoItemId: input.departamentoItemId ?? null,
            municipioItemId: input.municipioItemId ?? null,
            zonaItemId: input.zonaItemId ?? null,
          },
        });

        await tx.internalUserRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: createdUser.id,
            roleId,
          })),
          skipDuplicates: true,
        });

        if (input.storeIds.length > 0) {
          await tx.userStore.createMany({
            data: input.storeIds.map((storeId) => ({
              userId: createdUser.id,
              storeId,
            })),
            skipDuplicates: true,
          });
        }

        if (permissions.length > 0) {
          await tx.internalUserPermission.createMany({
            data: permissions.map((permission) => ({
              userId: createdUser.id,
              permissionId: permission.id,
            })),
            skipDuplicates: true,
          });
        }

        return createdUser;
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'internal_users.create',
        module: 'users',
        entityType: 'InternalUser',
        entityId: user.id,
        metadata: {
          email: user.email,
          roleIds: input.roleIds,
          storeIds: input.storeIds,
          permissionCodes: input.permissionCodes,
          mustChangePassword: input.mustChangePassword,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return this.prisma.internalUser.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
          roleAssignments: { include: { role: true } },
          directPermissions: { include: { permission: true } },
          storeAssignments: { include: { store: true } },
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario interno con ese correo.');
      }

      throw error;
    }
  }

  async updateUser(id: string, input: UpdateInternalUserInput, actor: InternalAuthUser, request: FastifyRequest) {
    this.assertUpdatePermissions(input, actor);

    const existingUser = await this.prisma.internalUser.findUnique({
      where: { id },
      include: {
        roleAssignments: true,
        directPermissions: true,
        storeAssignments: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario interno no encontrado.');
    }

    const roleIds = input.roleIds;
    const storeIds = input.storeIds;
    const permissionCodes = input.permissionCodes;
    if (storeIds) {
      this.assertSingleStoreAssignment(storeIds);
    }

    const [roles, stores, permissions] = await Promise.all([
      roleIds ? this.prisma.role.findMany({ where: { id: { in: roleIds }, isActive: true } }) : Promise.resolve([]),
      storeIds ? this.prisma.store.findMany({ where: { id: { in: storeIds }, status: 'ACTIVE' } }) : Promise.resolve([]),
      permissionCodes ? this.prisma.permission.findMany({ where: { code: { in: permissionCodes } } }) : Promise.resolve([]),
    ]);

    if (roleIds && roles.length !== roleIds.length) {
      throw new BadRequestException('Uno o mas roles no existen o estan inactivos.');
    }

    if (storeIds && stores.length !== storeIds.length) {
      throw new BadRequestException('Una o mas tiendas no existen o estan inactivas.');
    }
    if (permissionCodes && permissions.length !== permissionCodes.length) {
      throw new BadRequestException('Uno o mas permisos no existen.');
    }

    const updateData: Prisma.InternalUserUpdateInput = {};

    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.mustChangePassword !== undefined) updateData.mustChangePassword = input.mustChangePassword;
    if ('paisItemId' in input) {
      updateData.paisItem = input.paisItemId ? { connect: { id: input.paisItemId } } : { disconnect: true };
    }
    if ('departamentoItemId' in input) {
      updateData.departamentoItem = input.departamentoItemId ? { connect: { id: input.departamentoItemId } } : { disconnect: true };
    }
    if ('municipioItemId' in input) {
      updateData.municipioItem = input.municipioItemId ? { connect: { id: input.municipioItemId } } : { disconnect: true };
    }
    if ('zonaItemId' in input) {
      updateData.zonaItem = input.zonaItemId ? { connect: { id: input.zonaItemId } } : { disconnect: true };
    }

    if (input.password) {
      updateData.passwordHash = await argon2.hash(input.password);
      updateData.mustChangePassword = input.mustChangePassword ?? true;
      updateData.failedLoginCount = 0;
      updateData.lockedUntil = null;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.internalUser.update({
          where: { id },
          data: updateData,
        });

        if (roleIds) {
          await tx.internalUserRole.deleteMany({ where: { userId: id } });
          await tx.internalUserRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId })),
            skipDuplicates: true,
          });
        }

        if (storeIds) {
          await tx.userStore.deleteMany({ where: { userId: id } });

          if (storeIds.length > 0) {
            await tx.userStore.createMany({
              data: storeIds.map((storeId) => ({ userId: id, storeId })),
              skipDuplicates: true,
            });
          }

          await tx.internalSession.updateMany({
            where: {
              internalUserId: id,
              revokedAt: null,
              activeStoreId: storeIds.length > 0 ? { notIn: storeIds } : { not: null },
            },
            data: { activeStoreId: null },
          });
        }

        if (permissionCodes) {
          await tx.internalUserPermission.deleteMany({ where: { userId: id } });

          if (permissions.length > 0) {
            await tx.internalUserPermission.createMany({
              data: permissions.map((permission) => ({ userId: id, permissionId: permission.id })),
              skipDuplicates: true,
            });
          }
        }

        if (input.status && input.status !== 'ACTIVE') {
          await tx.internalSession.updateMany({
            where: { internalUserId: id, revokedAt: null },
            data: { revokedAt: new Date(), activeStoreId: null },
          });
        }
      });

      await this.auditService.record({
        actorType: 'INTERNAL_USER',
        actorInternalUserId: actor.id,
        action: 'internal_users.update',
        module: 'users',
        entityType: 'InternalUser',
        entityId: id,
        metadata: {
          email: input.email ?? existingUser.email,
          status: input.status ?? existingUser.status,
          roleIds,
          storeIds,
          permissionCodes,
          passwordChanged: Boolean(input.password),
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return this.getUser(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario interno con ese correo.');
      }

      throw error;
    }
  }

  updateUserPermissions(id: string, input: UpdateInternalUserPermissionsInput, actor: InternalAuthUser, request: FastifyRequest) {
    return this.updateUser(id, { permissionCodes: input.permissionCodes }, actor, request);
  }

  private assertSingleStoreAssignment(storeIds: string[]) {
    if (storeIds.length > 1) {
      throw new BadRequestException('Un usuario solo puede tener una tienda asignada.');
    }
  }

  private assertUpdatePermissions(input: UpdateInternalUserInput, actor: InternalAuthUser) {
    const permissions = new Set(actor.permissions);
    if (permissions.has('users.manage')) return;

    const needsEdit = input.fullName !== undefined
      || input.email !== undefined
      || input.password !== undefined
      || input.mustChangePassword !== undefined;

    if (needsEdit && !permissions.has('users.edit')) {
      throw new ForbiddenException('No tienes permiso para editar usuarios.');
    }

    if (input.status !== undefined && !permissions.has('users.status')) {
      throw new ForbiddenException('No tienes permiso para inactivar o reactivar usuarios.');
    }

    if (input.roleIds !== undefined && !permissions.has('users.assign_roles')) {
      throw new ForbiddenException('No tienes permiso para asignar roles.');
    }

    if (input.storeIds !== undefined && !permissions.has('users.assign_stores')) {
      throw new ForbiddenException('No tienes permiso para asignar tiendas.');
    }

    if (input.permissionCodes !== undefined && !permissions.has('users.manage_permissions')) {
      throw new ForbiddenException('No tienes permiso para gestionar permisos directos.');
    }
  }
}
