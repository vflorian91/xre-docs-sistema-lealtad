import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  ['users.read', 'users', 'read', 'Ver listado de usuarios'],
  ['users.view_profile', 'users', 'view_profile', 'Ver perfil de usuario'],
  ['users.create', 'users', 'create', 'Crear usuarios'],
  ['users.edit', 'users', 'edit', 'Editar usuarios'],
  ['users.status', 'users', 'status', 'Inactivar o reactivar usuarios'],
  ['users.assign_roles', 'users', 'assign_roles', 'Asignar roles a usuarios'],
  ['users.assign_stores', 'users', 'assign_stores', 'Asignar tiendas a usuarios'],
  ['users.manage_permissions', 'users', 'manage_permissions', 'Gestionar permisos directos de usuarios'],
  ['users.manage', 'users', 'manage', 'Administrar usuarios sin restriccion por accion'],
  ['users.export', 'users', 'export', 'Exportar usuarios'],
  ['roles.read', 'roles', 'read', 'Consultar roles'],
  ['roles.manage', 'roles', 'manage', 'Crear y editar roles'],
  ['permissions.read', 'permissions', 'read', 'Consultar permisos'],
  ['stores.read', 'stores', 'read', 'Ver listado de tiendas'],
  ['stores.view_profile', 'stores', 'view_profile', 'Ver detalle de tienda'],
  ['stores.create', 'stores', 'create', 'Crear tiendas'],
  ['stores.edit', 'stores', 'edit', 'Editar tiendas'],
  ['stores.status', 'stores', 'status', 'Inactivar o reactivar tiendas'],
  ['stores.assign_users', 'stores', 'assign_users', 'Asignar usuarios a tiendas'],
  ['stores.manage', 'stores', 'manage', 'Administrar tiendas sin restriccion por accion'],
  ['stores.export', 'stores', 'export', 'Exportar tiendas'],
  ['stores.catalog_manage', 'stores', 'catalog_manage', 'Gestionar catalogo de tiendas'],
  ['customers.read', 'customers', 'read', 'Ver listado de clientes'],
  ['customers.view_all', 'customers', 'view_all', 'Ver clientes de todas las tiendas'],
  ['customers.view_profile', 'customers', 'view_profile', 'Ver perfil de cliente'],
  ['customers.create', 'customers', 'create', 'Registrar clientes'],
  ['customers.edit', 'customers', 'edit', 'Editar clientes'],
  ['customers.status', 'customers', 'status', 'Inactivar o reactivar clientes'],
  ['customers.manage', 'customers', 'manage', 'Administrar clientes sin restriccion por accion'],
  ['customers.export', 'customers', 'export', 'Exportar clientes'],
  ['purchases.read', 'purchases', 'read', 'Consultar compras'],
  ['purchases.create', 'purchases', 'create', 'Registrar compras desde tienda'],
  ['purchases.review', 'purchases', 'review', 'Revisar compras pendientes'],
  ['purchases.reverse', 'purchases', 'reverse', 'Solicitar o aprobar reversas'],
  ['points.read', 'points', 'read', 'Consultar puntos'],
  ['points.manage', 'points', 'manage', 'Ajustar puntos con autorizacion'],
  ['settings.read', 'settings', 'read', 'Consultar configuracion'],
  ['settings.manage', 'settings', 'manage', 'Editar configuracion'],
  ['catalogs.read', 'catalogs', 'read', 'Consultar catalogos'],
  ['catalogs.manage', 'catalogs', 'manage', 'Editar catalogos'],
  ['marketing.read', 'marketing', 'read', 'Consultar banners y contenido visual'],
  ['marketing.manage', 'marketing', 'manage', 'Gestionar banners y contenido visual'],
  ['notifications.read', 'notifications', 'read', 'Consultar notificaciones internas'],
  ['notifications.manage', 'notifications', 'manage', 'Crear y gestionar notificaciones internas'],
  ['redeemable_products.read', 'redeemable_products', 'read', 'Ver productos canjeables'],
  ['redeemable_products.create', 'redeemable_products', 'create', 'Crear productos canjeables'],
  ['redeemable_products.edit', 'redeemable_products', 'edit', 'Editar productos canjeables'],
  ['redeemable_products.status', 'redeemable_products', 'status', 'Activar o inactivar productos canjeables'],
  ['redemption_requests.read', 'redemption_requests', 'read', 'Ver solicitudes de canje'],
  ['redemption_requests.redeem_points', 'redemption_requests', 'redeem_points', 'Canjear directamente puntos de clientes'],
  ['redemption_requests.reject', 'redemption_requests', 'reject', 'Rechazar solicitudes de canje'],
  ['redemption_requests.mark_ready', 'redemption_requests', 'mark_ready', 'Marcar solicitudes de canje como listas para recoger'],
  ['redemption_requests.mark_delivered', 'redemption_requests', 'mark_delivered', 'Marcar solicitudes de canje como entregadas'],
  ['redemption_requests.cancel', 'redemption_requests', 'cancel', 'Cancelar solicitudes de canje'],
  ['reports.read', 'reports', 'read', 'Consultar reportes'],
  ['reports.export', 'reports', 'export', 'Exportar reportes'],
  ['audit.read', 'audit', 'read', 'Consultar auditoria'],
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

const roleDefinitions = [
  {
    name: 'Super Admin',
    description: 'Rol administrativo principal. Los permisos se asignan directamente al usuario.',
  },
  {
    name: 'Admin',
    description: 'Rol administrativo operativo. Los permisos se asignan directamente al usuario.',
  },
  {
    name: 'Supervisor',
    description: 'Rol de supervision operativa. Los permisos se asignan directamente al usuario.',
  },
  {
    name: 'Vendedora',
    description: 'Rol de operacion basica de tienda. Los permisos se asignan directamente al usuario.',
  },
  {
    name: 'Auditor',
    description: 'Rol de auditoria y consulta. Los permisos se asignan directamente al usuario.',
  },
];

const catalogDefinitions = [
  {
    code: 'PRODUCTOS',
    name: 'Productos',
    description: 'Familias principales de productos.',
    items: [
      ['CALZADO', 'Calzado', undefined, undefined, 'Familia principal de calzado.', true],
    ],
  },
  {
    code: 'SHOE_TYPES',
    name: 'Tipos de calzado',
    description: 'Tipos de calzado asociados al producto Calzado.',
    items: [
      ['TACONES', 'Tacones', 'PRODUCTOS', 'CALZADO'],
      ['SANDALIAS', 'Sandalias', 'PRODUCTOS', 'CALZADO'],
      ['BOTAS', 'Botas', 'PRODUCTOS', 'CALZADO'],
      ['TENIS', 'Tenis', 'PRODUCTOS', 'CALZADO'],
      ['FLATS', 'Flats', 'PRODUCTOS', 'CALZADO'],
      ['MOCASINES', 'Mocasines', 'PRODUCTOS', 'CALZADO'],
      ['PLATAFORMAS', 'Plataformas', 'PRODUCTOS', 'CALZADO'],
      ['FORMAL', 'Zapato formal', 'PRODUCTOS', 'CALZADO'],
      ['CASUAL', 'Zapato casual', 'PRODUCTOS', 'CALZADO'],
      ['DEPORTIVO', 'Deportivo', 'PRODUCTOS', 'CALZADO'],
    ],
  },
  {
    code: 'PRODUCT_CATEGORIES',
    name: 'Categorias o lineas',
    description: 'Categorias o lineas comerciales usadas en compras y reportes.',
    items: [
      ['CASUAL', 'Casual'],
      ['FORMAL', 'Formal'],
      ['TEMPORADA', 'Temporada'],
      ['PROMOCION', 'Promocion'],
    ],
  },
  {
    code: 'BRANDS',
    name: 'Marcas',
    description: 'Marcas opcionales asociadas a compras.',
    items: [
      ['NINE_WEST', 'Nine West'],
      ['RIMET', 'Rimet'],
    ],
  },
  {
    code: 'REWARD_CATEGORY',
    name: 'Categorias de premios',
    description: 'Categorias para clasificar productos canjeables.',
    items: [
      ['BOLSOS', 'Bolsos'],
      ['ZAPATOS', 'Zapatos'],
      ['ACCESORIOS', 'Accesorios'],
      ['CUPONES', 'Cupones'],
      ['PREMIOS_ESPECIALES', 'Premios especiales'],
    ],
  },
  {
    code: 'PAIS',
    name: 'Paises',
    description: 'Catalogo geografico de paises para clientes.',
    items: [],
  },
  {
    code: 'DEPARTAMENTO',
    name: 'Departamentos',
    description: 'Departamentos asociados a un pais.',
    items: [],
  },
  {
    code: 'MUNICIPIO',
    name: 'Municipios',
    description: 'Municipios asociados a un departamento.',
    items: [],
  },
  {
    code: 'ZONA',
    name: 'Zonas',
    description: 'Zonas o sectores asociados a un municipio.',
    items: [],
  },
];

const redeemableProductDefinitions = [
  {
    code: 'GIFT_Q25',
    name: 'Tarjeta Regalo Q25',
    description: 'Tarjeta de regalo para compras en tienda.',
    pointsValue: 5000,
    stock: 100,
    imageUrl: null,
    isFeatured: true,
    displayOrder: 1,
    categoryCode: 'CUPONES',
  },
  {
    code: 'URBAN_BACKPACK',
    name: 'Mochila Urbana',
    description: 'Mochila urbana promocional.',
    pointsValue: 7500,
    stock: 25,
    imageUrl: null,
    isFeatured: true,
    displayOrder: 2,
    categoryCode: 'BOLSOS',
  },
  {
    code: 'COFFEE_MAKER',
    name: 'Cafetera Premium',
    description: 'Cafetera premium para clientes destacados.',
    pointsValue: 9500,
    stock: 10,
    imageUrl: null,
    isFeatured: true,
    displayOrder: 3,
    categoryCode: 'PREMIOS_ESPECIALES',
  },
  {
    code: 'WIRELESS_EARBUDS',
    name: 'Auriculares Inalambricos',
    description: 'Auriculares inalambricos promocionales.',
    pointsValue: 12000,
    stock: 15,
    imageUrl: null,
    isFeatured: true,
    displayOrder: 4,
    categoryCode: 'ACCESORIOS',
  },
];

const settingDefinitions = [
  {
    key: 'POINTS_TO_BALANCE_CONVERSION',
    value: {
      points: 100,
      amount: 1,
      minimumPoints: 100,
      isEnabled: true,
    },
    description: 'Regla operativa para convertir puntos de clientes en saldo promocional.',
  },
  {
    key: 'REDEMPTIONS',
    value: {
      expirationDays: 30,
    },
    description: 'Reglas operativas para solicitudes y vencimientos de canjes.',
  },
  {
    key: 'PROMOTIONAL_BALANCE',
    value: {
      maxUsePerPurchase: null,
    },
    description: 'Limites operativos para uso de saldo promocional en tienda.',
  },
];

async function main() {
  for (const [code, module, action, description] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { module, action, description },
      create: { code, module, action, description },
    });
  }

  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: roleDefinition.name },
      update: {
        description: roleDefinition.description,
        isSystem: true,
        isActive: true,
      },
      create: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: true,
        isActive: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  }

  await prisma.pointRule.upsert({
    where: { id: 'default-point-rule' },
    update: {
      name: 'Regla inicial Q1 = 1 punto',
      amountPerPoint: '1.00',
      pointValueAmount: '0.01',
      minimumAmount: '0.00',
      maxPointsPerPurchase: 1000,
      pointsExpirationDays: null,
      roundingMode: 'FLOOR',
      isActive: true,
    },
    create: {
      id: 'default-point-rule',
      name: 'Regla inicial Q1 = 1 punto',
      amountPerPoint: '1.00',
      pointValueAmount: '0.01',
      minimumAmount: '0.00',
      maxPointsPerPurchase: 1000,
      pointsExpirationDays: null,
      roundingMode: 'FLOOR',
      isActive: true,
    },
  });

  const itemByCatalogCode = new Map();

  for (const catalogDefinition of catalogDefinitions) {
    const catalog = await prisma.catalog.upsert({
      where: { code: catalogDefinition.code },
      update: {
        name: catalogDefinition.name,
        description: catalogDefinition.description,
        isActive: true,
      },
      create: {
        code: catalogDefinition.code,
        name: catalogDefinition.name,
        description: catalogDefinition.description,
        isActive: true,
      },
    });

    for (const [index, itemDefinition] of catalogDefinition.items.entries()) {
      const [code, name, parentCatalogCode, parentItemCode, description, allowsSubcatalog] = itemDefinition;
      const parentItem = parentCatalogCode && parentItemCode
        ? itemByCatalogCode.get(`${parentCatalogCode}:${parentItemCode}`)
        : null;
      const item = await prisma.catalogItem.upsert({
        where: {
          catalogId_code: {
            catalogId: catalog.id,
            code,
          },
        },
        update: {
          name,
          description: description ?? null,
          allowsSubcatalog: Boolean(allowsSubcatalog),
          sortOrder: index,
          isActive: true,
          parentItemId: parentItem?.id ?? null,
        },
        create: {
          catalogId: catalog.id,
          code,
          name,
          description: description ?? null,
          allowsSubcatalog: Boolean(allowsSubcatalog),
          sortOrder: index,
          isActive: true,
          parentItemId: parentItem?.id ?? null,
        },
      });
      itemByCatalogCode.set(`${catalogDefinition.code}:${code}`, item);
    }
  }

  for (const { categoryCode, ...productDefinition } of redeemableProductDefinitions) {
    const categoryItem = itemByCatalogCode.get(`REWARD_CATEGORY:${categoryCode}`);
    await prisma.redeemableProduct.upsert({
      where: { code: productDefinition.code },
      update: {
        ...productDefinition,
        categoryItemId: categoryItem?.id ?? null,
        isActive: true,
        isPublished: true,
      },
      create: {
        ...productDefinition,
        categoryItemId: categoryItem?.id ?? null,
        isActive: true,
        isPublished: true,
      },
    });
  }

  for (const settingDefinition of settingDefinitions) {
    await prisma.setting.upsert({
      where: { key: settingDefinition.key },
      update: {
        description: settingDefinition.description,
      },
      create: {
        key: settingDefinition.key,
        value: settingDefinition.value,
        description: settingDefinition.description,
        isEditable: true,
      },
    });
  }

  await prisma.marketingBanner.upsert({
    where: { id: 'seed-banner-ninewest-2x-puntos' },
    update: {
      title: '2X puntos en todas tus compras',
      subtitle: 'Este fin de semana',
      badge: 'NINE WEST',
      imageUrl: '/images/banners/optimized/banner-ninewest-2x-puntos.png',
      ctaLabel: 'Ver tiendas',
      ctaUrl: '/beneficios',
      tone: 'blue',
      status: 'ACTIVE',
      isActive: true,
      startsAt: new Date('2026-06-16T00:00:00.000Z'),
      endsAt: new Date('2027-06-16T23:59:59.000Z'),
      sortOrder: 1,
    },
    create: {
      id: 'seed-banner-ninewest-2x-puntos',
      title: '2X puntos en todas tus compras',
      subtitle: 'Este fin de semana',
      badge: 'NINE WEST',
      imageUrl: '/images/banners/optimized/banner-ninewest-2x-puntos.png',
      ctaLabel: 'Ver tiendas',
      ctaUrl: '/beneficios',
      tone: 'blue',
      status: 'ACTIVE',
      isActive: true,
      startsAt: new Date('2026-06-16T00:00:00.000Z'),
      endsAt: new Date('2027-06-16T23:59:59.000Z'),
      sortOrder: 1,
    },
  });

  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SEED_SUPER_ADMIN_FULL_NAME?.trim() || 'Super Administrador';

  if (!email || !password) {
    console.log('Seed base creado. Define SEED_SUPER_ADMIN_EMAIL y SEED_SUPER_ADMIN_PASSWORD para crear el primer Super Admin.');
    return;
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  const passwordHash = await argon2.hash(password);

  const user = await prisma.internalUser.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash,
      status: 'ACTIVE',
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      fullName,
      email,
      passwordHash,
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  });

  await prisma.internalUserRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id,
    },
  });

  const allPermissions = await prisma.permission.findMany({ select: { id: true } });
  await prisma.internalUserPermission.createMany({
    data: allPermissions.map((permission) => ({
      userId: user.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      actorType: 'SYSTEM',
      action: 'seed.super_admin_upserted',
      module: 'auth',
      entityType: 'InternalUser',
      entityId: user.id,
      metadata: { email },
    },
  });

  console.log(`Seed base creado. Super Admin listo: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
