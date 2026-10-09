import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const QA_ADMIN_EMAIL = 'qa.admin.tienda.online@example.com';
const QA_ADMIN_PASSWORD = 'QAAdmin123!';
const QA_LIMITED_EMAIL = 'qa.sin.permisos.tienda.online@example.com';
const QA_LIMITED_PASSWORD = 'QASinPermisos123!';
const QA_DRIVER_EMAIL = 'qa.mensajero.demo@example.com';
const QA_DRIVER_PASSWORD = 'QAMensajero123!';
const QA_CUSTOMER_PASSWORD = 'QACliente123!';

const STORE_PERMISSIONS = [
  ['store_brands.read', 'store_brands', 'read', 'Ver marcas de tienda online'],
  ['store_brands.create', 'store_brands', 'create', 'Crear marcas de tienda online'],
  ['store_brands.edit', 'store_brands', 'edit', 'Editar marcas de tienda online'],
  ['store_brands.status', 'store_brands', 'status', 'Activar o inactivar marcas de tienda online'],
  ['store_products.read', 'store_products', 'read', 'Ver productos de tienda online'],
  ['store_products.create', 'store_products', 'create', 'Crear productos de tienda online'],
  ['store_products.edit', 'store_products', 'edit', 'Editar productos de tienda online'],
  ['store_products.status', 'store_products', 'status', 'Activar o inactivar productos de tienda online'],
  ['store_products.stock', 'store_products', 'stock', 'Ajustar stock de productos de tienda online'],
  ['store_products.visibility', 'store_products', 'visibility', 'Controlar visibilidad de productos en tienda online'],
  ['store_products.images', 'store_products', 'images', 'Gestionar imagenes de productos de tienda online'],
  ['store_orders.read', 'store_orders', 'read', 'Ver pedidos de tienda online'],
  ['store_orders.review', 'store_orders', 'review', 'Marcar pedidos en revision'],
  ['store_orders.confirm', 'store_orders', 'confirm', 'Confirmar pedidos de tienda online'],
  ['store_orders.reschedule', 'store_orders', 'reschedule', 'Reprogramar pedidos de tienda online'],
  ['store_orders.cancel', 'store_orders', 'cancel', 'Cancelar pedidos de tienda online'],
  ['store_orders.payments', 'store_orders', 'payments', 'Gestionar pagos de pedidos de tienda online'],
  ['store_orders.visa_link', 'store_orders', 'visa_link', 'Registrar enlaces Visa Link en pedidos'],
  ['store_delivery_schedule.read', 'store_delivery_schedule', 'read', 'Ver agenda de entregas de tienda online'],
  ['store_delivery_schedule.program', 'store_delivery_schedule', 'program', 'Programar entregas de tienda online'],
  ['store_delivery_schedule.reschedule', 'store_delivery_schedule', 'reschedule', 'Reprogramar entregas de tienda online'],
  ['store_delivery_schedule.assign', 'store_delivery_schedule', 'assign', 'Asignar mensajeros a entregas de tienda online'],
  ['store_delivery_schedule.cancel', 'store_delivery_schedule', 'cancel', 'Cancelar programacion logistica de entregas'],
  ['store_drivers.read', 'store_drivers', 'read', 'Ver mensajeros de tienda online'],
  ['store_drivers.create', 'store_drivers', 'create', 'Crear mensajeros de tienda online'],
  ['store_drivers.edit', 'store_drivers', 'edit', 'Editar mensajeros de tienda online'],
  ['store_drivers.access', 'store_drivers', 'access', 'Gestionar acceso de mensajeros a la PWA'],
  ['store_drivers.status', 'store_drivers', 'status', 'Activar o inactivar mensajeros de tienda online'],
  ['store_payment_settlements.read', 'store_payment_settlements', 'read', 'Ver liquidaciones de cobros'],
  ['store_payment_settlements.create', 'store_payment_settlements', 'create', 'Crear liquidaciones de cobros'],
  ['store_payment_settlements.annul', 'store_payment_settlements', 'annul', 'Anular liquidaciones de cobros'],
  ['store_payment_settlements.incidents', 'store_payment_settlements', 'incidents', 'Gestionar incidencias de cobros'],
  ['store_payment_settlements.export', 'store_payment_settlements', 'export', 'Exportar liquidaciones de cobros'],
  ['store_reports.read', 'store_reports', 'read', 'Ver reportes de tienda online'],
  ['store_reports.export', 'store_reports', 'export', 'Exportar reportes de tienda online'],
  ['store_reports.sales', 'store_reports', 'sales', 'Ver reporte de ventas y pedidos'],
  ['store_reports.payments', 'store_reports', 'payments', 'Ver reporte de pagos'],
  ['store_reports.settlements', 'store_reports', 'settlements', 'Ver reporte de liquidaciones'],
  ['store_reports.deliveries', 'store_reports', 'deliveries', 'Ver reporte de entregas'],
  ['store_reports.products', 'store_reports', 'products', 'Ver reporte de productos'],
  ['store_reports.customers', 'store_reports', 'customers', 'Ver reporte de clientes compradores'],
];

const customers = [
  { key: 'efectivo', name: 'QA Cliente Efectivo', phone: '50100001', email: 'qa.cliente.efectivo@example.com', taxId: 'QA-EFECTIVO' },
  { key: 'visa', name: 'QA Cliente Visa Link', phone: '50100002', email: 'qa.cliente.visa@example.com', taxId: 'QA-VISA' },
  { key: 'transferencia', name: 'QA Cliente Transferencia', phone: '50100003', email: 'qa.cliente.transferencia@example.com', taxId: 'QA-TRANSFERENCIA' },
  { key: 'deposito', name: 'QA Cliente Deposito', phone: '50100004', email: 'qa.cliente.deposito@example.com', taxId: 'QA-DEPOSITO' },
];

const productDefinitions = [
  { sku: 'QA-ZAPATO-DAMA', name: 'QA Producto Zapato Dama', price: 349.0 },
  { sku: 'QA-ZAPATO-NINO', name: 'QA Producto Zapato Nino', price: 219.0 },
  { sku: 'QA-SANDALIA-DEMO', name: 'QA Producto Sandalia Demo', price: 189.0 },
];

const orderDefinitions = [
  {
    number: 'QA-PED-EFECTIVO-DEMO',
    customer: 'efectivo',
    productSku: 'QA-ZAPATO-DAMA',
    quantity: 1,
    method: 'EFECTIVO_CONTRA_ENTREGA',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'PENDIENTE_LIQUIDAR',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    timeline: 'QA efectivo entregado con cobro completo pendiente de liquidar.',
  },
  {
    number: 'QA-PED-VISA-PENDIENTE-DEMO',
    customer: 'visa',
    productSku: 'QA-ZAPATO-NINO',
    quantity: 1,
    method: 'VISA_LINK_MANUAL',
    paymentStatus: 'LINK_ENVIADO',
    settlementStatus: 'NO_APLICA',
    orderStatus: 'EN_RUTA',
    deliveryStatus: 'EN_RUTA',
    visaLinkUrl: 'https://pagos.example.com/qa-visa-pendiente',
    timeline: 'QA Visa Link en ruta con pago no confirmado para validar bloqueo de mensajero.',
  },
  {
    number: 'QA-PED-VISA-CONFIRMADO-DEMO',
    customer: 'visa',
    productSku: 'QA-ZAPATO-NINO',
    quantity: 2,
    method: 'VISA_LINK_MANUAL',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'PENDIENTE_LIQUIDAR',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    visaLinkUrl: 'https://pagos.example.com/qa-visa-confirmado',
    authorizationCode: 'QA-AUTH-VISA',
    referenceNumber: 'QA-REF-VISA',
    timeline: 'QA Visa Link confirmado pendiente de liquidar.',
  },
  {
    number: 'QA-PED-TRANSFERENCIA-DEMO',
    customer: 'transferencia',
    productSku: 'QA-SANDALIA-DEMO',
    quantity: 1,
    method: 'TRANSFERENCIA_BANCARIA',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'PENDIENTE_LIQUIDAR',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    referenceNumber: 'QA-REF-TRANSFERENCIA',
    timeline: 'QA transferencia confirmada pendiente de liquidar.',
  },
  {
    number: 'QA-PED-DEPOSITO-DEMO',
    customer: 'deposito',
    productSku: 'QA-ZAPATO-DAMA',
    quantity: 1,
    method: 'DEPOSITO_BANCARIO',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'PENDIENTE_LIQUIDAR',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    referenceNumber: 'QA-REF-DEPOSITO',
    timeline: 'QA deposito confirmado pendiente de liquidar.',
  },
  {
    number: 'QA-PED-NO-ENTREGADO-DEMO',
    customer: 'efectivo',
    productSku: 'QA-SANDALIA-DEMO',
    quantity: 1,
    method: 'EFECTIVO_CONTRA_ENTREGA',
    paymentStatus: 'NO_PAGADO',
    settlementStatus: 'NO_APLICA',
    orderStatus: 'NO_ENTREGADO',
    deliveryStatus: 'NO_ENTREGADA',
    timeline: 'QA no entregado con motivo de prueba.',
  },
  {
    number: 'QA-PED-INCIDENCIA-DEMO',
    customer: 'transferencia',
    productSku: 'QA-ZAPATO-NINO',
    quantity: 1,
    method: 'TRANSFERENCIA_BANCARIA',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'CON_INCIDENCIA',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    referenceNumber: 'QA-REF-INCIDENCIA',
    timeline: 'QA pago con incidencia de liquidacion.',
  },
  {
    number: 'QA-PED-LIQUIDADO-DEMO',
    customer: 'deposito',
    productSku: 'QA-ZAPATO-DAMA',
    quantity: 1,
    method: 'DEPOSITO_BANCARIO',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'LIQUIDADO',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    referenceNumber: 'QA-REF-LIQUIDADO',
    settlementNumber: 'QA-LIQ-ACTIVA-DEMO',
    timeline: 'QA pago liquidado en liquidacion activa.',
  },
  {
    number: 'QA-PED-LIQUIDACION-ANULADA-DEMO',
    customer: 'efectivo',
    productSku: 'QA-ZAPATO-NINO',
    quantity: 1,
    method: 'EFECTIVO_CONTRA_ENTREGA',
    paymentStatus: 'PAGO_CONFIRMADO',
    settlementStatus: 'PENDIENTE_LIQUIDAR',
    orderStatus: 'ENTREGADO',
    deliveryStatus: 'ENTREGADA',
    settlementNumber: 'QA-LIQ-ANULADA-DEMO',
    timeline: 'QA pago devuelto a pendiente por liquidacion anulada.',
  },
];

async function main() {
  assertQaSeedIsAllowed();

  const passwordHash = await argon2.hash(QA_ADMIN_PASSWORD);
  const limitedPasswordHash = await argon2.hash(QA_LIMITED_PASSWORD);
  const customerPasswordHash = await argon2.hash(QA_CUSTOMER_PASSWORD);
  const driverPasswordHash = await argon2.hash(QA_DRIVER_PASSWORD);

  for (const [code, module, action, description] of STORE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: { module, action, description },
      create: { code, module, action, description },
    });
  }

  const admin = await prisma.internalUser.upsert({
    where: { email: QA_ADMIN_EMAIL },
    update: { fullName: 'QA Admin Tienda Online', passwordHash, status: 'ACTIVE', mustChangePassword: false },
    create: { fullName: 'QA Admin Tienda Online', email: QA_ADMIN_EMAIL, passwordHash, status: 'ACTIVE', mustChangePassword: false },
  });

  await prisma.internalUser.upsert({
    where: { email: QA_LIMITED_EMAIL },
    update: { fullName: 'QA Usuario Sin Permisos Tienda Online', passwordHash: limitedPasswordHash, status: 'ACTIVE', mustChangePassword: false },
    create: { fullName: 'QA Usuario Sin Permisos Tienda Online', email: QA_LIMITED_EMAIL, passwordHash: limitedPasswordHash, status: 'ACTIVE', mustChangePassword: false },
  });

  const permissions = await prisma.permission.findMany({ where: { code: { in: STORE_PERMISSIONS.map(([code]) => code) } } });
  for (const permission of permissions) {
    await prisma.internalUserPermission.upsert({
      where: { userId_permissionId: { userId: admin.id, permissionId: permission.id } },
      update: {},
      create: { userId: admin.id, permissionId: permission.id },
    });
  }

  const brand = await prisma.storeBrand.upsert({
    where: { code: 'QA_STORE_BRAND' },
    update: {
      name: 'QA Marca Tienda Online',
      description: 'Marca de prueba para QA integral de Tienda Online.',
      isActive: true,
      displayOrder: 1,
      updatedByInternalUserId: admin.id,
    },
    create: {
      code: 'QA_STORE_BRAND',
      name: 'QA Marca Tienda Online',
      description: 'Marca de prueba para QA integral de Tienda Online.',
      isActive: true,
      displayOrder: 1,
      createdByInternalUserId: admin.id,
    },
  });

  const products = new Map();
  for (const [index, product] of productDefinitions.entries()) {
    const saved = await prisma.storeProduct.upsert({
      where: { sku: product.sku },
      update: {
        brandId: brand.id,
        name: product.name,
        shortDescription: 'Producto QA visible en Tienda Online.',
        price: product.price,
        stockQuantity: 200,
        minimumStock: 5,
        isActive: true,
        isVisibleInStore: true,
        isFeatured: index === 0,
        displayOrder: index + 1,
        updatedByInternalUserId: admin.id,
      },
      create: {
        brandId: brand.id,
        sku: product.sku,
        name: product.name,
        shortDescription: 'Producto QA visible en Tienda Online.',
        fullDescription: 'Producto de prueba controlado para QA integral de Tienda Online.',
        price: product.price,
        stockQuantity: 200,
        minimumStock: 5,
        isActive: true,
        isVisibleInStore: true,
        isFeatured: index === 0,
        displayOrder: index + 1,
        createdByInternalUserId: admin.id,
      },
    });
    products.set(product.sku, saved);
  }

  const customerMap = new Map();
  for (const customer of customers) {
    const saved = await prisma.customer.upsert({
      where: { phone: customer.phone },
      update: {
        fullName: customer.name,
        email: customer.email,
        taxId: customer.taxId,
        passwordHash: customerPasswordHash,
        status: 'ACTIVE',
        registrationSource: 'QA_TIENDA_ONLINE',
        address: 'Direccion QA zona 10',
        city: 'Guatemala',
        department: 'Guatemala',
        country: 'Guatemala',
      },
      create: {
        code: `QA-${customer.key.toUpperCase()}`,
        fullName: customer.name,
        phone: customer.phone,
        email: customer.email,
        taxId: customer.taxId,
        passwordHash: customerPasswordHash,
        status: 'ACTIVE',
        registrationSource: 'QA_TIENDA_ONLINE',
        address: 'Direccion QA zona 10',
        city: 'Guatemala',
        department: 'Guatemala',
        country: 'Guatemala',
      },
    });
    customerMap.set(customer.key, saved);
  }

  // Libreta de direcciones QA (aditivo: solo crea si el cliente aun no tiene direcciones).
  for (const customer of customers) {
    const saved = customerMap.get(customer.key);
    if (!saved) continue;
    const existing = await prisma.customerAddress.count({ where: { customerId: saved.id } });
    if (existing > 0) continue;
    await prisma.customerAddress.create({
      data: {
        customerId: saved.id,
        label: 'Casa',
        department: 'Guatemala',
        municipality: 'Guatemala',
        zone: '10',
        addressLine: 'Direccion QA 4a calle 5-55 zona 10',
        reference: 'Edificio QA, recepcion',
        contactPhone: customer.phone,
        isDefault: true,
        isActive: true,
      },
    });
  }

  const driver = await prisma.storeDriver.upsert({
    where: { code: 'QA-MENSAJERO-DEMO' },
    update: {
      fullName: 'QA Mensajero Demo',
      phone: '50100009',
      email: QA_DRIVER_EMAIL,
      passwordHash: driverPasswordHash,
      mustChangePassword: false,
      accessStatus: 'ACTIVO',
      type: 'INTERNO',
      isActive: true,
      notes: 'Mensajero de prueba para QA integral.',
      updatedByInternalUserId: admin.id,
    },
    create: {
      code: 'QA-MENSAJERO-DEMO',
      fullName: 'QA Mensajero Demo',
      phone: '50100009',
      email: QA_DRIVER_EMAIL,
      passwordHash: driverPasswordHash,
      mustChangePassword: false,
      accessStatus: 'ACTIVO',
      type: 'INTERNO',
      isActive: true,
      notes: 'Mensajero de prueba para QA integral.',
      createdByInternalUserId: admin.id,
    },
  });

  const receiptAsset = await prisma.mediaAsset.upsert({
    where: { storageKey: 'qa/store-online/payment-receipt.pdf' },
    update: {
      purpose: 'STORE_PAYMENT_RECEIPT',
      filename: 'qa-comprobante.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      storageProvider: 'qa-seed',
      publicUrl: '/api/media/assets/qa-store-payment-receipt/content',
      uploadedByInternalUserId: admin.id,
    },
    create: {
      id: 'qa-store-payment-receipt',
      purpose: 'STORE_PAYMENT_RECEIPT',
      filename: 'qa-comprobante.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      storageProvider: 'qa-seed',
      storageKey: 'qa/store-online/payment-receipt.pdf',
      publicUrl: '/api/media/assets/qa-store-payment-receipt/content',
      uploadedByInternalUserId: admin.id,
    },
  });

  const createdOrders = [];
  for (const definition of orderDefinitions) {
    const customer = customerMap.get(definition.customer);
    const product = products.get(definition.productSku);
    const total = Number(product.price) * definition.quantity;
    const now = new Date();

    const order = await prisma.storeOrder.upsert({
      where: { orderNumber: definition.number },
      update: {
        customerId: customer.id,
        subtotalAmount: total,
        shippingAmount: 0,
        totalAmount: total,
        paymentMethodRequested: definition.method,
        clientPaymentStatus: definition.paymentStatus,
        orderStatus: definition.orderStatus,
        deliveryStatus: definition.deliveryStatus,
        suggestedDeliveryDate: new Date('2026-07-02T09:00:00.000Z'),
        confirmedDeliveryDate: definition.deliveryStatus === 'PENDIENTE_PROGRAMACION' ? null : new Date('2026-07-03T09:00:00.000Z'),
        deliveryTimeRange: '09:00 a 12:00',
        deliveryAddress: 'Direccion QA zona 10',
        deliveryReference: 'Referencia QA controlada',
        deliveryPhone: customer.phone,
        receiverName: customer.fullName,
        assignedDriverId: driver.id,
      },
      create: {
        orderNumber: definition.number,
        customerId: customer.id,
        subtotalAmount: total,
        shippingAmount: 0,
        totalAmount: total,
        paymentMethodRequested: definition.method,
        clientPaymentStatus: definition.paymentStatus,
        orderStatus: definition.orderStatus,
        deliveryStatus: definition.deliveryStatus,
        suggestedDeliveryDate: new Date('2026-07-02T09:00:00.000Z'),
        confirmedDeliveryDate: definition.deliveryStatus === 'PENDIENTE_PROGRAMACION' ? null : new Date('2026-07-03T09:00:00.000Z'),
        deliveryTimeRange: '09:00 a 12:00',
        deliveryAddress: 'Direccion QA zona 10',
        deliveryReference: 'Referencia QA controlada',
        deliveryPhone: customer.phone,
        receiverName: customer.fullName,
        assignedDriverId: driver.id,
      },
    });

    const existingItem = await prisma.storeOrderItem.findFirst({ where: { orderId: order.id, productId: product.id } });
    if (existingItem) {
      await prisma.storeOrderItem.update({
        where: { id: existingItem.id },
        data: {
          brandId: brand.id,
          productNameSnapshot: product.name,
          brandNameSnapshot: brand.name,
          productImageSnapshot: product.mainImageUrl,
          unitPrice: product.price,
          quantity: definition.quantity,
          subtotal: total,
        },
      });
    } else {
      await prisma.storeOrderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          brandId: brand.id,
          productNameSnapshot: product.name,
          brandNameSnapshot: brand.name,
          productImageSnapshot: product.mainImageUrl,
          unitPrice: product.price,
          quantity: definition.quantity,
          subtotal: total,
        },
      });
    }

    const existingPayment = await prisma.storeOrderPayment.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    const paymentData = {
      paymentMethod: definition.method,
      paymentStatus: definition.paymentStatus,
      amount: total,
      currency: 'GTQ',
      visaLinkUrl: definition.visaLinkUrl ?? null,
      visaLinkSentAt: definition.visaLinkUrl ? now : null,
      visaLinkSentByInternalUserId: definition.visaLinkUrl ? admin.id : null,
      authorizationCode: definition.authorizationCode ?? null,
      referenceNumber: definition.referenceNumber ?? null,
      paidAt: definition.paymentStatus === 'PAGO_CONFIRMADO' ? now : null,
      confirmedByInternalUserId: definition.paymentStatus === 'PAGO_CONFIRMADO' && definition.method !== 'EFECTIVO_CONTRA_ENTREGA' ? admin.id : null,
      receivedByDriverId: definition.paymentStatus === 'PAGO_CONFIRMADO' && definition.method === 'EFECTIVO_CONTRA_ENTREGA' ? driver.id : null,
      notes: definition.timeline,
      settlementStatus: definition.settlementStatus,
      receiptFileUrl: definition.method === 'EFECTIVO_CONTRA_ENTREGA' ? null : receiptAsset.publicUrl,
      receiptFileName: definition.method === 'EFECTIVO_CONTRA_ENTREGA' ? null : receiptAsset.filename,
      receiptUploadedAt: definition.method === 'EFECTIVO_CONTRA_ENTREGA' ? null : now,
      receiptUploadedByInternalUserId: definition.method === 'EFECTIVO_CONTRA_ENTREGA' ? null : admin.id,
    };
    const payment = existingPayment
      ? await prisma.storeOrderPayment.update({ where: { id: existingPayment.id }, data: paymentData })
      : await prisma.storeOrderPayment.create({ data: { orderId: order.id, ...paymentData } });

    const existingTimeline = await prisma.storeOrderTimeline.findFirst({
      where: { orderId: order.id, comment: definition.timeline },
    });
    if (!existingTimeline) {
      await prisma.storeOrderTimeline.create({
        data: {
          orderId: order.id,
          statusType: 'ORDER_STATUS',
          previousStatus: null,
          newStatus: definition.orderStatus,
          comment: definition.timeline,
          createdByInternalUserId: admin.id,
          createdByRole: 'SYSTEM',
        },
      });
    }

    await prisma.storeDeliveryAssignmentHistory.upsert({
      where: { id: `qa_assign_${definition.number}` },
      update: { newDriverId: driver.id, reasonCode: 'QA_DEMO', comment: 'Asignacion QA controlada.' },
      create: { id: `qa_assign_${definition.number}`, orderId: order.id, newDriverId: driver.id, reasonCode: 'QA_DEMO', comment: 'Asignacion QA controlada.', createdByInternalUserId: admin.id },
    });

    createdOrders.push({ definition, order, payment, total });
  }

  await ensureSettlement({
    settlementNumber: 'QA-LIQ-ACTIVA-DEMO',
    status: 'ACTIVA',
    paymentRow: createdOrders.find((row) => row.definition.number === 'QA-PED-LIQUIDADO-DEMO'),
    admin,
  });

  await ensureSettlement({
    settlementNumber: 'QA-LIQ-ANULADA-DEMO',
    status: 'ANULADA',
    paymentRow: createdOrders.find((row) => row.definition.number === 'QA-PED-LIQUIDACION-ANULADA-DEMO'),
    admin,
  });

  const counts = {
    brands: 1,
    products: products.size,
    customers: customerMap.size,
    orders: createdOrders.length,
    pendingSettlement: createdOrders.filter((row) => row.definition.settlementStatus === 'PENDIENTE_LIQUIDAR').length,
    incidents: createdOrders.filter((row) => row.definition.settlementStatus === 'CON_INCIDENCIA').length,
  };

  const result = {
    ok: true,
    admin: { email: QA_ADMIN_EMAIL },
    limitedAdmin: { email: QA_LIMITED_EMAIL },
    driver: { email: QA_DRIVER_EMAIL },
    counts,
    message: 'Credenciales QA creadas. Para imprimirlas explicitamente usa PRINT_QA_CREDENTIALS=true en entorno controlado.',
  };

  if (process.env.PRINT_QA_CREDENTIALS === 'true') {
    Object.assign(result, {
      admin: { email: QA_ADMIN_EMAIL, password: QA_ADMIN_PASSWORD },
      limitedAdmin: { email: QA_LIMITED_EMAIL, password: QA_LIMITED_PASSWORD },
      driver: { email: QA_DRIVER_EMAIL, password: QA_DRIVER_PASSWORD },
      customerPassword: QA_CUSTOMER_PASSWORD,
      message: 'Credenciales QA impresas por PRINT_QA_CREDENTIALS=true. Usar solo en entorno controlado.',
    });
  }

  console.log(JSON.stringify(result, null, 2));
}

function assertQaSeedIsAllowed() {
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production' || process.env.ALLOW_QA_SEED !== 'true') {
    throw new Error('QA seed bloqueado. Para ejecutarlo usa ALLOW_QA_SEED=true en un entorno no productivo.');
  }
}

async function ensureSettlement({ settlementNumber, status, paymentRow, admin }) {
  if (!paymentRow) return;
  const isActive = status === 'ACTIVA';
  const settlement = await prisma.storePaymentSettlement.upsert({
    where: { settlementNumber },
    update: {
      settlementDate: new Date('2026-07-04T09:00:00.000Z'),
      paymentMethod: paymentRow.definition.method,
      totalPayments: 1,
      totalAmount: paymentRow.total,
      status,
      reference: `${settlementNumber}-REF`,
      comment: `Liquidacion QA ${status.toLowerCase()}.`,
      createdByInternalUserId: admin.id,
      annulledByInternalUserId: isActive ? null : admin.id,
      annulledAt: isActive ? null : new Date(),
      annulmentReason: isActive ? null : 'Anulacion QA controlada.',
    },
    create: {
      settlementNumber,
      settlementDate: new Date('2026-07-04T09:00:00.000Z'),
      paymentMethod: paymentRow.definition.method,
      totalPayments: 1,
      totalAmount: paymentRow.total,
      status,
      reference: `${settlementNumber}-REF`,
      comment: `Liquidacion QA ${status.toLowerCase()}.`,
      createdByInternalUserId: admin.id,
      annulledByInternalUserId: isActive ? null : admin.id,
      annulledAt: isActive ? null : new Date(),
      annulmentReason: isActive ? null : 'Anulacion QA controlada.',
    },
  });

  await prisma.storePaymentSettlementItem.upsert({
    where: { paymentId: paymentRow.payment.id },
    update: {
      settlementId: settlement.id,
      orderId: paymentRow.order.id,
      amount: paymentRow.total,
      paymentMethod: paymentRow.definition.method,
      authorizationCode: paymentRow.payment.authorizationCode,
      voucherNumber: paymentRow.payment.voucherNumber,
      referenceNumber: paymentRow.payment.referenceNumber,
      paidAt: paymentRow.payment.paidAt,
    },
    create: {
      settlementId: settlement.id,
      paymentId: paymentRow.payment.id,
      orderId: paymentRow.order.id,
      amount: paymentRow.total,
      paymentMethod: paymentRow.definition.method,
      authorizationCode: paymentRow.payment.authorizationCode,
      voucherNumber: paymentRow.payment.voucherNumber,
      referenceNumber: paymentRow.payment.referenceNumber,
      paidAt: paymentRow.payment.paidAt,
    },
  });

  await prisma.storeOrderPayment.update({
    where: { id: paymentRow.payment.id },
    data: isActive
      ? {
          settlementStatus: 'LIQUIDADO',
          settlementId: settlement.id,
          settledAt: new Date(),
          settledByInternalUserId: admin.id,
        }
      : {
          settlementStatus: 'PENDIENTE_LIQUIDAR',
          settlementId: null,
          settledAt: null,
          settledByInternalUserId: null,
        },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
