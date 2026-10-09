import assert from 'node:assert/strict';
import test from 'node:test';
import { customerRegisterSchema } from '../src/modules/auth/auth.schemas';
import { createMarketingBannerSchema } from '../src/modules/marketing-banners/marketing-banner.schemas';
import { listRedemptionsSchema } from '../src/modules/redemptions/redemption.schemas';
import { createStoreOrderSchema } from '../src/modules/store-catalog/order/store-order.schemas';
import { STORE_PAYMENT_STATUS, initialPaymentStatusForMethod } from '../src/modules/store-catalog/order/store-order.constants';

const validRegistration = {
  firstName: 'Ana',
  lastName: 'López',
  taxId: '1234567-8',
  phone: '55554444',
  email: 'ana@example.com',
  password: 'Password123!',
};

test('customer registration accepts catalog and store identifiers', () => {
  const parsed = customerRegisterSchema.parse({
    ...validRegistration,
    brandItemId: 'cm12345678901234567890123',
    registrationStoreId: 'cm22345678901234567890123',
  });

  assert.equal(parsed.brandItemId, 'cm12345678901234567890123');
  assert.equal(parsed.registrationStoreId, 'cm22345678901234567890123');
});

test('customer registration rejects malformed identifiers', () => {
  assert.equal(customerRegisterSchema.safeParse({ ...validRegistration, brandItemId: 'adidas' }).success, false);
});

const validBanner = {
  title: 'Promoción de prueba',
  imageUrl: '/media/banner.png',
  startsAt: new Date('2026-06-20T00:00:00.000Z'),
  endsAt: new Date('2026-06-30T23:59:59.000Z'),
  sortOrder: 1,
};

test('brand-targeted banner requires at least one brand', () => {
  const result = createMarketingBannerSchema.safeParse({
    ...validBanner,
    audienceType: 'BRANDS',
    targetBrandIds: [],
  });

  assert.equal(result.success, false);
});

test('global banner does not require brand targets', () => {
  const result = createMarketingBannerSchema.safeParse({
    ...validBanner,
    audienceType: 'ALL',
    targetBrandIds: [],
  });

  assert.equal(result.success, true);
});

test('redemption workflow no longer accepts pending approval status', () => {
  assert.equal(listRedemptionsSchema.safeParse({ status: 'PENDING' }).success, false);
  assert.equal(listRedemptionsSchema.safeParse({ status: 'APPROVED' }).success, true);
});

const validStoreOrder = {
  deliveryAddress: 'Zona 10, Guatemala',
  deliveryPhone: '55554444',
};

test('store order accepts only official online store payment methods', () => {
  for (const paymentMethodRequested of [
    'EFECTIVO_CONTRA_ENTREGA',
    'VISA_LINK_MANUAL',
    'TRANSFERENCIA_BANCARIA',
    'DEPOSITO_BANCARIO',
  ]) {
    assert.equal(createStoreOrderSchema.safeParse({ ...validStoreOrder, paymentMethodRequested }).success, true);
  }

  for (const paymentMethodRequested of ['POS_CONTRA_ENTREGA', 'TARJETA', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY', 'PASARELA_DE_PAGO']) {
    assert.equal(createStoreOrderSchema.safeParse({ ...validStoreOrder, paymentMethodRequested }).success, false);
  }
});

test('store order payment methods start with the official payment status', () => {
  assert.equal(initialPaymentStatusForMethod('EFECTIVO_CONTRA_ENTREGA'), STORE_PAYMENT_STATUS.PENDIENTE_PAGO);
  assert.equal(initialPaymentStatusForMethod('VISA_LINK_MANUAL'), STORE_PAYMENT_STATUS.PENDIENTE_LINK);
  assert.equal(initialPaymentStatusForMethod('TRANSFERENCIA_BANCARIA'), STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION);
  assert.equal(initialPaymentStatusForMethod('DEPOSITO_BANCARIO'), STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION);
});
