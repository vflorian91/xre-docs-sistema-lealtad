import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import argon2 from 'argon2';
import { DriverDeliveriesService } from '../src/modules/driver/driver-deliveries.service';
import { DriverAuthUser, InternalAuthUser } from '../src/modules/auth/auth.types';
import { StoreOrderLoyaltyService } from '../src/modules/store-catalog/order/store-order-loyalty.service';
import {
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_PAYMENT_METHOD,
  STORE_PAYMENT_STATUS,
  STORE_SETTLEMENT_STATUS,
} from '../src/modules/store-catalog/order/store-order.constants';
import { StorePaymentSettlementsAdminService } from '../src/modules/store-catalog/payment-settlements/store-payment-settlements-admin.service';
import { STORE_PAYMENT_SETTLEMENT_STATUS } from '../src/modules/store-catalog/payment-settlements/store-payment-settlement.constants';
import { StoreReportsAdminService } from '../src/modules/store-catalog/reports/store-reports-admin.service';

const driver: DriverAuthUser = {
  id: 'driver-1',
  fullName: 'Mensajero QA',
  phone: '50100009',
  accessStatus: 'ACTIVO',
  isActive: true,
  sessionId: 'session-driver',
  mustChangePassword: false,
};

const actor: InternalAuthUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  fullName: 'Admin QA',
  roles: [],
  permissions: [],
  storeIds: [],
  sessionId: 'session-admin',
  mustChangePassword: false,
};

function deliveryOrder(input: { method: string; paymentStatus: string; amount?: number; deliveryCodeHash?: string | null }) {
  return {
    id: 'order-1',
    orderNumber: 'QA-PED-1',
    assignedDriverId: driver.id,
    orderStatus: STORE_ORDER_STATUS.EN_RUTA,
    deliveryStatus: STORE_DELIVERY_STATUS.EN_RUTA,
    deliveryCodeHash: input.deliveryCodeHash ?? null,
    deliveryCodeStatus: input.deliveryCodeHash ? 'PENDING_VALIDATION' : null,
    deliveryCodeGeneratedAt: input.deliveryCodeHash ? new Date('2026-07-01T11:00:00.000Z') : null,
    deliveryCodeValidatedAt: null,
    deliveryCodeFailedAttempts: 0,
    paymentMethodRequested: input.method,
    clientPaymentStatus: input.paymentStatus,
    totalAmount: input.amount ?? 100,
    customer: { id: 'customer-1', fullName: 'Cliente QA', phone: '50100001' },
    items: [],
    payments: [
      {
        id: 'payment-1',
        paymentMethod: input.method,
        paymentStatus: input.paymentStatus,
        settlementStatus: STORE_SETTLEMENT_STATUS.NO_APLICA,
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
      },
    ],
    timeline: [],
  };
}

function driverServiceFor(order: ReturnType<typeof deliveryOrder>) {
  const updates: Array<{ model: string; input: unknown }> = [];
  const loyaltyAwards: string[] = [];
  const tx = {
    storeOrderPayment: { update: async (input: unknown) => updates.push({ model: 'payment', input }) },
    storeOrder: { update: async (input: unknown) => updates.push({ model: 'order', input }) },
  };
  const prisma = {
    storeOrder: { findFirst: async () => order },
    $transaction: async (callback: (txClient: typeof tx) => Promise<void>) => callback(tx),
  };
  const timelineService = { registerEvent: async () => undefined };
  const notificationsService = {};
  const loyaltyService = { awardForDeliveredOrder: async (orderId: string) => { loyaltyAwards.push(orderId); } };
  return { service: new DriverDeliveriesService(prisma as never, timelineService as never, notificationsService as never, loyaltyService as never), updates, loyaltyAwards };
}

for (const method of [
  STORE_PAYMENT_METHOD.VISA_LINK_MANUAL,
  STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA,
  STORE_PAYMENT_METHOD.DEPOSITO_BANCARIO,
]) {
  test(`mensajero no puede entregar ${method} con pago pendiente`, async () => {
    const { service } = driverServiceFor(deliveryOrder({ method, paymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION }));

    await assert.rejects(
      () => service.confirmDelivery(driver, 'order-1', { deliveryComment: 'Entrega QA' }),
      /Debe confirmarse el pago desde Admin antes de entregar/,
    );
  });
}

test('mensajero puede completar efectivo si el monto coincide exactamente y dispara puntos al entregar', async () => {
  const { service, updates, loyaltyAwards } = driverServiceFor(deliveryOrder({
    method: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
    paymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
    amount: 125,
    deliveryCodeHash: await argon2.hash('123456'),
  }));

  await service.confirmDelivery(driver, 'order-1', { deliveryCode: '123456', deliveryComment: 'Efectivo completo', receivedCash: true, amountReceived: 125 });

  assert.equal(updates.some((entry) => entry.model === 'payment'), true);
  assert.equal(updates.some((entry) => entry.model === 'order'), true);
  assert.deepEqual(loyaltyAwards, ['order-1']);
});

function loyaltyServiceFor(order: unknown) {
  const pointMovements: unknown[] = [];
  const orderUpdates: unknown[] = [];
  const tx = {
    pointMovement: { create: async (input: unknown) => pointMovements.push(input) },
    storeOrder: { update: async (input: unknown) => orderUpdates.push(input) },
  };
  const prisma = {
    storeOrder: {
      findUnique: async () => order,
      update: async (input: unknown) => orderUpdates.push(input),
    },
    $transaction: async (callback: (txClient: typeof tx) => Promise<void>) => callback(tx),
  };
  const pointRulesService = {
    getActiveRule: async () => ({
      id: 'rule-1',
      name: 'Regla QA',
      amountPerPoint: 10,
      minimumAmount: 0,
      maxPointsPerPurchase: null,
      pointsExpirationDays: null,
    }),
  };
  const loyaltyLevelsService = { recalculateCustomerLevel: async () => undefined };
  const notificationsService = { notifyPointsEarned: async () => undefined };
  return {
    service: new StoreOrderLoyaltyService(prisma as never, pointRulesService as never, loyaltyLevelsService as never, notificationsService as never),
    pointMovements,
    orderUpdates,
  };
}

test('puntos de compra online se acreditan solo al entregar y por productos marcados', async () => {
  const deliveredOrder = {
    id: 'order-points-1',
    orderNumber: 'QA-PED-PTS',
    customerId: 'customer-1',
    orderStatus: STORE_ORDER_STATUS.ENTREGADO,
    deliveryStatus: STORE_DELIVERY_STATUS.ENTREGADA,
    loyaltyPointsAwarded: false,
    items: [
      { subtotal: 100, product: { generatesLoyaltyPoints: true } },
      { subtotal: 90, product: { generatesLoyaltyPoints: false } },
    ],
  };
  const delivered = loyaltyServiceFor(deliveredOrder);
  await delivered.service.awardForDeliveredOrder('order-points-1');
  assert.equal(delivered.pointMovements.length, 1);
  assert.equal((delivered.pointMovements[0] as { data: { points: number } }).data.points, 10);
  assert.equal((delivered.orderUpdates.at(-1) as { data: { loyaltyPointsAwardedValue: number } }).data.loyaltyPointsAwardedValue, 10);

  const notDelivered = loyaltyServiceFor({ ...deliveredOrder, deliveryStatus: STORE_DELIVERY_STATUS.EN_RUTA, orderStatus: STORE_ORDER_STATUS.EN_RUTA });
  await notDelivered.service.awardForDeliveredOrder('order-points-1');
  assert.equal(notDelivered.pointMovements.length, 0);
  assert.equal(notDelivered.orderUpdates.length, 0);
});

test('mensajero no puede completar efectivo con monto parcial', async () => {
  const { service } = driverServiceFor(deliveryOrder({
    method: STORE_PAYMENT_METHOD.EFECTIVO_CONTRA_ENTREGA,
    paymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_PAGO,
    amount: 125,
  }));

  await assert.rejects(
    () => service.confirmDelivery(driver, 'order-1', { deliveryComment: 'Efectivo parcial', receivedCash: true, amountReceived: 100 }),
    /debe coincidir exactamente/,
  );
});

function settlementService(prisma: Record<string, unknown>) {
  const numberService = { nextSettlementNumber: async () => 'QA-LIQ-001' };
  const timelineService = { registerEvent: async () => undefined };
  return new StorePaymentSettlementsAdminService(prisma as never, numberService as never, timelineService as never);
}

test('crear liquidacion exige pagos confirmados y pendientes de liquidar', async () => {
  const service = settlementService({
    storeOrderPayment: {
      findMany: async () => [
        {
          id: 'payment-1',
          orderId: 'order-1',
          paymentMethod: STORE_PAYMENT_METHOD.TRANSFERENCIA_BANCARIA,
          paymentStatus: STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION,
          settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
          settlementId: null,
          amount: 100,
          authorizationCode: null,
          voucherNumber: null,
          referenceNumber: null,
          paidAt: null,
        },
      ],
    },
  });

  await assert.rejects(
    () => service.create({ paymentIds: ['payment-1'], settlementDate: new Date('2026-07-04T00:00:00.000Z') }, actor),
    /deben estar confirmados/,
  );
});

test('pago con incidencia no aparece como elegible para liquidacion', async () => {
  let capturedWhere: unknown;
  const service = settlementService({
    storeOrderPayment: {
      findMany: async (input: { where: unknown }) => {
        capturedWhere = input.where;
        return [];
      },
    },
  });

  const rows = await service.listPending();

  assert.deepEqual(rows, []);
  assert.equal((capturedWhere as { settlementStatus: string }).settlementStatus, STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR);
});

test('anular liquidacion devuelve pagos a pendiente de liquidar', async () => {
  const paymentUpdates: unknown[] = [];
  const service = settlementService({
    storePaymentSettlement: {
      findUnique: async () => ({
        id: 'settlement-1',
        settlementNumber: 'QA-LIQ-001',
        status: STORE_PAYMENT_SETTLEMENT_STATUS.ACTIVA,
        items: [{ paymentId: 'payment-1', orderId: 'order-1' }],
      }),
      update: async () => undefined,
    },
    $transaction: async (callback: (tx: unknown) => Promise<void>) =>
      callback({
        storePaymentSettlement: { update: async () => undefined },
        storeOrderPayment: { update: async (input: unknown) => paymentUpdates.push(input) },
      }),
  });
  (service as unknown as { getAdmin: (settlementId: string) => Promise<{ id: string }> }).getAdmin = async (settlementId) => ({ id: settlementId });

  await service.annul('settlement-1', { annulmentReason: 'QA' }, actor);

  assert.deepEqual((paymentUpdates[0] as { data: { settlementStatus: string; settlementId: null } }).data, {
    settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR,
    settlementId: null,
    settledAt: null,
    settledByInternalUserId: null,
  });
});

test('exportes CSV de liquidaciones incluyen encabezados esperados', async () => {
  const service = settlementService({});
  (service as unknown as { listPending: () => Promise<unknown[]> }).listPending = async () => [];
  (service as unknown as { listAdmin: () => Promise<{ data: unknown[] }> }).listAdmin = async () => ({ data: [] });

  assert.equal(await service.exportCsv('pending'), 'Pedido,Cliente,Metodo,Monto,Referencia,Autorizacion,Mensajero,Fecha de pago');
  assert.equal(await service.exportCsv('settlements'), 'No. liquidacion,Fecha,Metodo,Cantidad de pagos,Monto total,Estado,Creado por');
});

test('export CSV de reportes responde encabezados correctos', async () => {
  const service = new StoreReportsAdminService({} as never);
  (service as unknown as { getSales: () => Promise<{ data: unknown[] }> }).getSales = async () => ({ data: [] });
  (service as unknown as { getPayments: () => Promise<{ data: unknown[] }> }).getPayments = async () => ({ data: [] });

  assert.equal(await service.exportCsv('sales'), 'No. pedido,Fecha,Cliente,Metodo de pago,Estado pedido,Estado pago,Estado entrega,Subtotal,Total');
  assert.equal(await service.exportCsv('payments'), 'No. pedido,Cliente,Metodo de pago,Monto,Estado pago,Estado liquidacion,Referencia,Autorizacion,Fecha de pago');
});
