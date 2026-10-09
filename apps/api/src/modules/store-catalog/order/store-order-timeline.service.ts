import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface RegisterTimelineEventInput {
  orderId: string;
  statusType: string;
  previousStatus?: string | null;
  newStatus: string;
  comment?: string | null;
  createdByInternalUserId?: string | null;
  createdByClientId?: string | null;
  createdByRole: string;
}

@Injectable()
export class StoreOrderTimelineService {
  async registerEvent(tx: Prisma.TransactionClient, input: RegisterTimelineEventInput) {
    return tx.storeOrderTimeline.create({
      data: {
        orderId: input.orderId,
        statusType: input.statusType,
        previousStatus: input.previousStatus ?? null,
        newStatus: input.newStatus,
        comment: input.comment ?? null,
        createdByInternalUserId: input.createdByInternalUserId ?? null,
        createdByClientId: input.createdByClientId ?? null,
        createdByRole: input.createdByRole,
      },
    });
  }

  async listForOrder(prisma: Prisma.TransactionClient, orderId: string) {
    return prisma.storeOrderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
