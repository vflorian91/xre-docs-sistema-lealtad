import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InternalAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { StoreOrderTimelineService } from './store-order-timeline.service';
import { AdminPickupStatusInput, AssignOriginStoreInput } from './store-order-pickup-admin.schemas';
import {
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PICKUP_STATUS,
  STORE_TIMELINE_ROLE,
  pickupReadinessForDelivery,
  pickupSummary,
} from './store-order.constants';

const itemInclude = {
  originStore: { select: { id: true, code: true, name: true } },
  pickedUpByDriver: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class StoreOrderPickupAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: StoreOrderTimelineService,
  ) {}

  async getPickup(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: itemInclude, orderBy: { createdAt: 'asc' } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    const summary = pickupSummary(order.items);
    const readiness = pickupReadinessForDelivery(order.items);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => this.toItemDto(item)),
      summary,
      readyForDelivery: readiness.ready,
      readyReason: readiness.reason ?? null,
    };
  }

  async getSummary(orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: { select: { pickupStatus: true } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }
    const readiness = pickupReadinessForDelivery(order.items);
    return { summary: pickupSummary(order.items), readyForDelivery: readiness.ready, readyReason: readiness.reason ?? null };
  }

  async assignOriginStore(orderId: string, itemId: string, input: AssignOriginStoreInput, actor: InternalAuthUser) {
    const item = await this.getItemOrThrow(orderId, itemId);
    if (item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO) {
      throw new BadRequestException('No puedes cambiar la tienda origen de un producto ya recolectado.');
    }

    const store = await this.prisma.store.findUnique({ where: { id: input.storeId }, select: { id: true, code: true, name: true, status: true } });
    if (!store) {
      throw new NotFoundException('Tienda origen no encontrada.');
    }
    if (store.status !== 'ACTIVE') {
      throw new BadRequestException('La tienda origen seleccionada no esta activa.');
    }

    const wasAssigned = Boolean(item.originStoreId);
    const previousStatus = item.pickupStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.storeOrderItem.update({
        where: { id: itemId },
        data: {
          originStoreId: store.id,
          originStoreSnapshot: { id: store.id, code: store.code, name: store.name },
          // Al asignar tienda, el producto queda pendiente de recolección.
          pickupStatus: STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION,
        },
        include: itemInclude,
      });
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PICKUP_STATUS,
        previousStatus,
        newStatus: STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION,
        comment: `${wasAssigned ? 'ORIGIN_STORE_CHANGED' : 'ORIGIN_STORE_ASSIGNED'} · ${next.productNameSnapshot} → ${store.name} (item ${itemId})${input.note ? ` · ${input.note}` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      return next;
    });

    return this.toItemDto(updated);
  }

  async setPickupStatus(orderId: string, itemId: string, input: AdminPickupStatusInput, actor: InternalAuthUser) {
    const item = await this.getItemOrThrow(orderId, itemId);
    if (item.pickupStatus === STORE_PICKUP_STATUS.RECOLECTADO && input.pickupStatus !== STORE_PICKUP_STATUS.CANCELADO) {
      throw new BadRequestException('El producto ya fue recolectado.');
    }
    if (
      input.pickupStatus === STORE_PICKUP_STATUS.PENDIENTE_RECOLECCION &&
      !item.originStoreId
    ) {
      throw new BadRequestException('Asigna una tienda origen antes de marcar el producto como pendiente de recolección.');
    }

    const previousStatus = item.pickupStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.storeOrderItem.update({
        where: { id: itemId },
        data: { pickupStatus: input.pickupStatus, pickupNote: input.note ?? item.pickupNote ?? null },
        include: itemInclude,
      });
      const eventLabel =
        input.pickupStatus === STORE_PICKUP_STATUS.NO_DISPONIBLE
          ? 'ITEM_NOT_AVAILABLE'
          : input.pickupStatus === STORE_PICKUP_STATUS.SUSTITUCION_REQUERIDA
            ? 'SUBSTITUTION_REQUIRED'
            : 'PICKUP_STATUS_CHANGED';
      await this.timelineService.registerEvent(tx, {
        orderId,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.PICKUP_STATUS,
        previousStatus,
        newStatus: input.pickupStatus,
        comment: `${eventLabel} · ${next.productNameSnapshot} (item ${itemId})${input.note ? ` · ${input.note}` : ''}`,
        createdByInternalUserId: actor.id,
        createdByRole: STORE_TIMELINE_ROLE.INTERNAL_USER,
      });
      return next;
    });

    return this.toItemDto(updated);
  }

  private async getItemOrThrow(orderId: string, itemId: string) {
    const item = await this.prisma.storeOrderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) {
      throw new NotFoundException('Producto del pedido no encontrado.');
    }
    return item;
  }

  private toItemDto(item: {
    id: string;
    productNameSnapshot: string;
    brandNameSnapshot: string;
    productImageSnapshot: string | null;
    quantity: number;
    pickupStatus: string;
    pickedUpAt: Date | null;
    pickupNote: string | null;
    originStore?: { id: string; code: string; name: string } | null;
    pickedUpByDriver?: { id: string; fullName: string } | null;
  }) {
    return {
      id: item.id,
      productName: item.productNameSnapshot,
      brandName: item.brandNameSnapshot,
      imageUrl: item.productImageSnapshot,
      quantity: item.quantity,
      pickupStatus: item.pickupStatus,
      pickedUpAt: item.pickedUpAt,
      pickupNote: item.pickupNote,
      originStore: item.originStore ?? null,
      pickedUpByDriver: item.pickedUpByDriver ?? null,
    };
  }
}
