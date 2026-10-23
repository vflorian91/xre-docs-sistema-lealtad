import assert from 'node:assert/strict';
import test from 'node:test';
import { DriverAuthUser } from '../src/modules/auth/auth.types';
import { DriverDeliveriesService } from '../src/modules/driver/driver-deliveries.service';
import { driverOperationDayRange } from '../src/modules/driver/driver-operation-day';

const driver: DriverAuthUser = {
  id: 'driver-dashboard', fullName: 'Andrea', phone: '50100000', accessStatus: 'ACTIVO',
  isActive: true, sessionId: 'dashboard-session', mustChangePassword: false,
};

function order(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, orderNumber: id, assignedDriverId: driver.id, orderStatus: 'ASIGNADO_MOTORISTA', deliveryStatus: 'ASIGNADA',
    confirmedDeliveryDate: new Date(Date.now() + 3 * 86_400_000), deliveryCodeValidatedAt: null,
    customer: { id: 'customer', fullName: 'Cliente', phone: '50100001' },
    deliveryAddress: 'Guatemala', totalAmount: 100, subtotalAmount: 100,
    items: [], payments: [], timeline: [], ...overrides,
  };
}

// Apply the Prisma predicates to fixtures so an incorrect date/status filter loses records.
function matches(record: Record<string, any>, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return condition.some((entry: Record<string, any>) => matches(record, entry));
    const value = record[key];
    if (condition === null || typeof condition !== 'object') return value === condition;
    if ('some' in condition) return value.some((entry: Record<string, any>) => matches(entry, condition.some));
    return Object.entries(condition).every(([operator, expected]: [string, any]) => {
      if (operator === 'in') return expected.includes(value);
      if (operator === 'notIn') return !expected.includes(value);
      if (operator === 'not') return value !== expected;
      if (operator === 'gte') return value != null && value >= expected;
      if (operator === 'lt') return value != null && value < expected;
      throw new Error(`Unsupported fixture predicate: ${operator}`);
    });
  });
}

function serviceFor(orders: ReturnType<typeof order>[]) {
  const prisma = {
    storeOrder: {
      findMany: async ({ where }: { where: Record<string, any> }) => orders.filter((entry) => matches(entry, where)),
      count: async ({ where }: { where: Record<string, any> }) => orders.filter((entry) => matches(entry, where)).length,
      findFirst: async () => null,
    },
    storeDriver: { findUnique: async () => driver },
    storeOrderPayment: { aggregate: async () => ({ _sum: { amount: null }, _count: 0 }) },
  };
  return new DriverDeliveriesService(prisma as never, {} as never, {} as never, {} as never);
}

test('dashboard keeps assignments across dates and counts completion instead of scheduled date', async () => {
  const orders = [
    order('future'),
    order('overdue', { confirmedDeliveryDate: new Date(Date.now() - 3 * 86_400_000), deliveryStatus: 'REPROGRAMADA' }),
    order('pickup', { deliveryStatus: 'EN_RECOLECCION' }),
    order('picked-up', { deliveryStatus: 'RECOLECCION_COMPLETA' }),
    order('route', { deliveryStatus: 'EN_RUTA' }),
    order('completed-early', { deliveryStatus: 'ENTREGADA', orderStatus: 'ENTREGADO', deliveryCodeValidatedAt: new Date() }),
    order('cancelled', { orderStatus: 'CANCELADO' }),
    order('closed', { orderStatus: 'CERRADO_POR_INCIDENCIA' }),
    order('other-driver', { assignedDriverId: 'other-driver' }),
  ];
  const service = serviceFor(orders);
  const dashboard = await service.dashboard(driver);
  assert.equal(dashboard.cards.pending, 5);
  assert.equal(dashboard.cards.inRoute, 1);
  assert.equal(dashboard.cards.delivered, 1);
  assert.deepEqual(dashboard.activeDeliveries.map((entry) => entry.id), ['future', 'overdue', 'pickup', 'picked-up', 'route']);
  const profile = await service.profile(driver);
  assert.equal(profile.metrics.pendingDeliveries, dashboard.cards.pending);
  assert.equal(profile.metrics.deliveredToday, dashboard.cards.delivered);
});

test('a completed assignment disappears from pending and increments delivered on the next refresh', async () => {
  const assignment = order('new-assignment');
  const service = serviceFor([assignment]);
  const before = await service.dashboard(driver);
  assert.equal(before.cards.pending, 1);
  assert.equal(before.cards.delivered, 0);
  Object.assign(assignment, { deliveryStatus: 'ENTREGADA', orderStatus: 'ENTREGADO', deliveryCodeValidatedAt: new Date() });
  const after = await service.dashboard(driver);
  assert.equal(after.cards.pending, 0);
  assert.equal(after.cards.delivered, 1);
  assert.deepEqual(after.activeDeliveries, []);
});

test('delivery history is a fallback only when the actual completion timestamp is missing', async () => {
  const day = driverOperationDayRange();
  const event = { statusType: 'DELIVERY_STATUS', newStatus: 'ENTREGADA', createdAt: new Date() };
  const delivered = { deliveryStatus: 'ENTREGADA', orderStatus: 'ENTREGADO' };
  const dashboard = await serviceFor([
    order('historical', { ...delivered, timeline: [event, event] }),
    order('old-completion', { ...delivered, deliveryCodeValidatedAt: new Date(day.gte.getTime() - 1), timeline: [event] }),
    order('next-day', { ...delivered, deliveryCodeValidatedAt: day.lt }),
    order('other-event', { ...delivered, timeline: [{ ...event, statusType: 'PAYMENT_STATUS' }] }),
  ]).dashboard(driver);
  assert.equal(dashboard.cards.delivered, 1);
});

test('operational day follows Guatemala midnight, including UTC day and year changes', () => {
  for (const [now, start, end] of [
    ['2026-10-23T00:14:40Z', '2026-10-22T06:00:00Z', '2026-10-23T06:00:00Z'],
    ['2026-10-23T05:59:59Z', '2026-10-22T06:00:00Z', '2026-10-23T06:00:00Z'],
    ['2026-10-23T06:00:00Z', '2026-10-23T06:00:00Z', '2026-10-24T06:00:00Z'],
    ['2027-01-01T00:01:00Z', '2026-12-31T06:00:00Z', '2027-01-01T06:00:00Z'],
  ]) {
    const range = driverOperationDayRange(new Date(now));
    assert.equal(range.gte.toISOString(), new Date(start).toISOString());
    assert.equal(range.lt.toISOString(), new Date(end).toISOString());
  }
});
