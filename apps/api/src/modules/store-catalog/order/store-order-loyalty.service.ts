import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PointRulesService } from '../../points/point-rules.service';
import { LoyaltyLevelsService } from '../../loyalty-levels/loyalty-levels.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { STORE_DELIVERY_STATUS, STORE_ORDER_STATUS } from './store-order.constants';

/**
 * FRD — Puntos de lealtad por compra en tienda online.
 * Reutiliza la configuración de puntos de lealtad (regla activa por monto).
 * Solo acredita al FINALIZAR el pedido (entregado) y solo por los productos
 * cuyo flag `generatesLoyaltyPoints` está activo. Idempotente por pedido.
 */
@Injectable()
export class StoreOrderLoyaltyService {
  private readonly logger = new Logger(StoreOrderLoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pointRulesService: PointRulesService,
    private readonly loyaltyLevelsService: LoyaltyLevelsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Acredita puntos cuando el pedido se entrega. No lanza: cualquier error se registra. */
  async awardForDeliveredOrder(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.storeOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: { select: { generatesLoyaltyPoints: true } } } } },
      });
      if (!order || order.loyaltyPointsAwarded) return;
      if (order.orderStatus !== STORE_ORDER_STATUS.ENTREGADO || order.deliveryStatus !== STORE_DELIVERY_STATUS.ENTREGADA) return;

      // Subtotal elegible: solo ítems cuyo producto genera puntos.
      const eligibleAmount = order.items.reduce((sum, item) => {
        const generates = item.product?.generatesLoyaltyPoints === true;
        return generates ? sum + Number(item.subtotal) : sum;
      }, 0);

      const rule = await this.pointRulesService.getActiveRule(null);
      const points = this.calculatePoints(eligibleAmount, rule);

      if (points <= 0) {
        await this.prisma.storeOrder.update({
          where: { id: orderId },
          data: { loyaltyPointsAwarded: true, loyaltyPointsAwardedValue: 0 },
        });
        return;
      }

      const expiresAt = this.calculateExpiration(rule.pointsExpirationDays);
      await this.prisma.$transaction(async (tx) => {
        await tx.pointMovement.create({
          data: {
            customerId: order.customerId,
            pointRuleId: rule.id,
            type: 'PURCHASE_EARNED',
            status: 'AVAILABLE',
            points,
            basePointsCalculated: points,
            pointsBeforePromotion: points,
            description: `Puntos por compra en línea ${order.orderNumber}`,
            pointRuleSnapshot: {
              id: rule.id,
              name: rule.name,
              amountPerPoint: rule.amountPerPoint.toString(),
              source: 'store_order',
              orderId: order.id,
              orderNumber: order.orderNumber,
              eligibleAmount: eligibleAmount.toFixed(2),
            } as Prisma.InputJsonValue,
            expiresAt,
          },
        });
        await tx.storeOrder.update({
          where: { id: orderId },
          data: { loyaltyPointsAwarded: true, loyaltyPointsAwardedValue: points },
        });
        await this.loyaltyLevelsService.recalculateCustomerLevel(order.customerId, tx);
      });

      await this.notificationsService
        .notifyPointsEarned(order.customerId, points, `tu compra en línea ${order.orderNumber}`, {
          event: 'store.order_points_earned',
          orderId: order.id,
          orderNumber: order.orderNumber,
        })
        .catch(() => undefined);
    } catch (error) {
      this.logger.warn(`No se pudieron acreditar puntos del pedido ${orderId}: ${(error as Error).message}`);
    }
  }

  private calculatePoints(amount: number, rule: Prisma.PointRuleGetPayload<Record<string, never>>): number {
    const amountPerPoint = Number(rule.amountPerPoint);
    if (amountPerPoint <= 0) return 0;
    if (amount < Number(rule.minimumAmount)) return 0;
    const rounded = Math.floor(amount / amountPerPoint);
    const capped = rule.maxPointsPerPurchase && rounded > rule.maxPointsPerPurchase ? rule.maxPointsPerPurchase : rounded;
    return Math.max(0, capped);
  }

  private calculateExpiration(days?: number | null): Date | null {
    if (!days || days <= 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
