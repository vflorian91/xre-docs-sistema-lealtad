import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const STORE_STOCK_MOVEMENT_TYPES = {
  INITIAL_STOCK: 'INITIAL_STOCK',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
} as const;

export type StoreStockMovementType = (typeof STORE_STOCK_MOVEMENT_TYPES)[keyof typeof STORE_STOCK_MOVEMENT_TYPES];

interface RegisterMovementInput {
  productId: string;
  variantId?: string | null;
  movementType: StoreStockMovementType | string;
  previousStock: number;
  newStock: number;
  referenceType?: string | null;
  referenceId?: string | null;
  comment?: string | null;
  createdByInternalUserId?: string | null;
}

@Injectable()
export class StoreStockMovementsService {
  async registerMovement(tx: Prisma.TransactionClient, input: RegisterMovementInput) {
    return tx.storeProductStockMovement.create({
      data: {
        productId: input.productId,
        variantId: input.variantId ?? null,
        movementType: input.movementType,
        quantity: input.newStock - input.previousStock,
        previousStock: input.previousStock,
        newStock: input.newStock,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        comment: input.comment ?? null,
        createdByInternalUserId: input.createdByInternalUserId ?? null,
      },
    });
  }

  async listForProduct(prisma: Prisma.TransactionClient, productId: string) {
    return prisma.storeProductStockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForVariant(prisma: Prisma.TransactionClient, variantId: string) {
    return prisma.storeProductStockMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasMovementForReference(
    prisma: Prisma.TransactionClient,
    input: { referenceType: string; referenceId: string; movementType: StoreStockMovementType | string },
  ) {
    const count = await prisma.storeProductStockMovement.count({
      where: { referenceType: input.referenceType, referenceId: input.referenceId, movementType: input.movementType },
    });
    return count > 0;
  }
}
