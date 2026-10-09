import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCustomerAddressInput, UpdateCustomerAddressInput } from './customer-address.schemas';

@Injectable()
export class CustomerAddressService {
  constructor(private readonly prisma: PrismaService) {}

  async list(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(customerId: string, id: string) {
    const address = await this.prisma.customerAddress.findFirst({ where: { id, customerId } });
    if (!address) {
      throw new NotFoundException('Direccion no encontrada.');
    }
    return address;
  }

  async create(customerId: string, input: CreateCustomerAddressInput) {
    const existingCount = await this.prisma.customerAddress.count({ where: { customerId, isActive: true } });
    // La primera direccion del cliente siempre queda como principal.
    const shouldBeDefault = input.isDefault === true || existingCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.customerAddress.create({
        data: {
          customerId,
          label: input.label || this.addressTypeLabel(input.addressType),
          addressType: input.addressType,
          department: input.department,
          municipality: input.municipality,
          zone: input.zone ?? null,
          addressLine: input.addressLine,
          reference: input.reference ?? null,
          postalCode: input.postalCode ?? null,
          recipientName: input.recipientName ?? null,
          contactPhone: input.contactPhone,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async update(customerId: string, id: string, input: UpdateCustomerAddressInput) {
    await this.get(customerId, id);
    const data: Prisma.CustomerAddressUpdateInput = {};
    if (input.label !== undefined) data.label = input.label || (input.addressType ? this.addressTypeLabel(input.addressType) : undefined);
    if (input.addressType !== undefined) data.addressType = input.addressType;
    if (input.department !== undefined) data.department = input.department;
    if (input.municipality !== undefined) data.municipality = input.municipality;
    if (input.zone !== undefined) data.zone = input.zone ?? null;
    if (input.addressLine !== undefined) data.addressLine = input.addressLine;
    if (input.reference !== undefined) data.reference = input.reference ?? null;
    if (input.postalCode !== undefined) data.postalCode = input.postalCode ?? null;
    if (input.recipientName !== undefined) data.recipientName = input.recipientName ?? null;
    if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
    if (input.latitude !== undefined) data.latitude = input.latitude ?? null;
    if (input.longitude !== undefined) data.longitude = input.longitude ?? null;

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
        data.isDefault = true;
      }
      return tx.customerAddress.update({ where: { id }, data });
    });
  }

  async setDefault(customerId: string, id: string) {
    await this.get(customerId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id }, data: { isDefault: true } });
    });
  }

  async inactivate(customerId: string, id: string) {
    const address = await this.get(customerId, id);
    const updated = await this.prisma.customerAddress.update({ where: { id }, data: { isActive: false, isDefault: false } });

    // Si era la principal, asciende la siguiente direccion activa.
    if (address.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({
        where: { customerId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return updated;
  }

  /** Carga una direccion activa del cliente para el checkout (valida pertenencia y estado). */
  async getActiveForCheckout(customerId: string, id: string) {
    const address = await this.prisma.customerAddress.findFirst({ where: { id, customerId } });
    if (!address) {
      throw new NotFoundException('Direccion no encontrada.');
    }
    if (!address.isActive) {
      throw new BadRequestException('No puedes usar una direccion inactiva en el pedido.');
    }
    return address;
  }

  private addressTypeLabel(type?: string) {
    const labels: Record<string, string> = {
      CASA: 'Casa',
      TRABAJO: 'Trabajo',
      OFICINA: 'Oficina',
      FAMILIA: 'Familia',
      OTRO: 'Otro',
    };
    return labels[type ?? 'CASA'] ?? 'Casa';
  }
}
