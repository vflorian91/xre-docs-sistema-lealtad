import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class StoreOrderNumberService {
  async nextOrderNumber(tx: Prisma.TransactionClient, referenceDate: Date = new Date()) {
    const sequence = await tx.storeOrderNumberSequence.upsert({
      where: { id: 1 },
      update: { nextValue: { increment: 1 } },
      create: { id: 1, nextValue: 2 },
    });

    const consumedValue = sequence.nextValue - 1;
    const year = referenceDate.getFullYear();

    return `PED-${year}-${String(consumedValue).padStart(6, '0')}`;
  }
}
