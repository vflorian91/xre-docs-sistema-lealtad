import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBankAccountInput, UpdateBankAccountInput } from './store-bank-account.schemas';

@Injectable()
export class StoreBankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin: lista todas (activas e inactivas). */
  listAll() {
    return this.prisma.storeBankAccount.findMany({ orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { bankName: 'asc' }] });
  }

  /** Cliente: solo cuentas activas, sin datos internos. */
  async listActiveForClient() {
    const accounts = await this.prisma.storeBankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { bankName: 'asc' }],
    });
    return accounts.map((account) => ({
      id: account.id,
      bankName: account.bankName,
      accountHolder: account.accountHolder,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
    }));
  }

  create(input: CreateBankAccountInput) {
    return this.prisma.storeBankAccount.create({
      data: {
        bankName: input.bankName,
        accountHolder: input.accountHolder,
        accountNumber: input.accountNumber,
        accountType: input.accountType,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, input: UpdateBankAccountInput) {
    await this.getOrThrow(id);
    return this.prisma.storeBankAccount.update({
      where: { id },
      data: {
        ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
        ...(input.accountHolder !== undefined ? { accountHolder: input.accountHolder } : {}),
        ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber } : {}),
        ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.getOrThrow(id);
    return this.prisma.storeBankAccount.update({ where: { id }, data: { isActive } });
  }

  /** Carga una cuenta activa para tomar el snapshot al reportar un pago. */
  async getActiveOrThrow(id: string) {
    const account = await this.prisma.storeBankAccount.findUnique({ where: { id } });
    if (!account || !account.isActive) {
      throw new NotFoundException('Cuenta bancaria no disponible.');
    }
    return account;
  }

  private async getOrThrow(id: string) {
    const account = await this.prisma.storeBankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Cuenta bancaria no encontrada.');
    }
    return account;
  }
}
