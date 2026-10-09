import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_PAYMENT_STATUS,
  STORE_SETTLEMENT_STATUS,
} from '../order/store-order.constants';
import { STORE_PAYMENT_SETTLEMENT_STATUS } from '../payment-settlements/store-payment-settlement.constants';

type ReportQuery = Record<string, string | undefined>;

const customerSelect = { id: true, fullName: true, phone: true, email: true, code: true };
const driverSelect = { id: true, fullName: true, phone: true, code: true };

const PENDING_ORDER_STATUSES = [
  STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
  STORE_ORDER_STATUS.EN_REVISION,
  STORE_ORDER_STATUS.CONFIRMADO_ADMIN,
  STORE_ORDER_STATUS.REPROGRAMADO,
  STORE_ORDER_STATUS.PREPARANDO_PEDIDO,
  STORE_ORDER_STATUS.ASIGNADO_MOTORISTA,
  STORE_ORDER_STATUS.EN_RUTA,
];

@Injectable()
export class StoreReportsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: ReportQuery = {}) {
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const orderWhere: Prisma.StoreOrderWhereInput = { ...(dateFilter ? { createdAt: dateFilter } : {}) };
    const confirmedOrderWhere: Prisma.StoreOrderWhereInput = { ...orderWhere, clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO };

    const [
      salesAggregate,
      totalOrders,
      delivered,
      pending,
      confirmedPayments,
      pendingSettlement,
      settledThisMonth,
      incidents,
      unitsSold,
      buyerCount,
      salesByMethod,
      ordersByStatus,
      deliveriesByStatus,
      topProducts,
      topCustomersRaw,
      recentSettlements,
    ] = await Promise.all([
      this.prisma.storeOrder.aggregate({ where: confirmedOrderWhere, _sum: { totalAmount: true } }),
      this.prisma.storeOrder.count({ where: orderWhere }),
      this.prisma.storeOrder.count({ where: { ...orderWhere, orderStatus: STORE_ORDER_STATUS.ENTREGADO } }),
      this.prisma.storeOrder.count({ where: { ...orderWhere, orderStatus: { in: PENDING_ORDER_STATUSES } } }),
      this.prisma.storeOrderPayment.count({ where: { paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO, ...(dateFilter ? { paidAt: dateFilter } : {}) } }),
      this.prisma.storeOrderPayment.aggregate({
        where: { paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO, settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.storeOrderPayment.aggregate({
        where: { settlementStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO, settledAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.storeOrderPayment.count({ where: { settlementStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA } }),
      this.prisma.storeOrderItem.aggregate({ where: { order: confirmedOrderWhere }, _sum: { quantity: true } }),
      this.prisma.storeOrder.findMany({ where: confirmedOrderWhere, select: { customerId: true }, distinct: ['customerId'] }),
      this.prisma.storeOrderPayment.groupBy({
        by: ['paymentMethod'],
        where: { paymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO, ...(dateFilter ? { paidAt: dateFilter } : {}) },
        _sum: { amount: true },
      }),
      this.prisma.storeOrder.groupBy({ by: ['orderStatus'], where: orderWhere, _count: true }),
      this.prisma.storeOrder.groupBy({ by: ['deliveryStatus'], where: orderWhere, _count: true }),
      this.prisma.storeOrderItem.groupBy({
        by: ['productId'],
        where: { order: confirmedOrderWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.storeOrder.groupBy({
        by: ['customerId'],
        where: confirmedOrderWhere,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.storePaymentSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const productIds = topProducts.map((row) => row.productId);
    const products = productIds.length
      ? await this.prisma.storeProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [];
    const productNameMap = new Map(products.map((product) => [product.id, product.name]));

    const customerIds = topCustomersRaw.map((row) => row.customerId);
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, fullName: true } })
      : [];
    const customerNameMap = new Map(customers.map((customer) => [customer.id, customer.fullName]));

    return {
      totalVendido: Number(salesAggregate._sum.totalAmount ?? 0),
      pedidosTotales: totalOrders,
      pedidosEntregados: delivered,
      pedidosPendientes: pending,
      pagosConfirmados: confirmedPayments,
      pendienteLiquidar: Number(pendingSettlement._sum.amount ?? 0),
      pendienteLiquidarCount: pendingSettlement._count,
      liquidadoEsteMes: Number(settledThisMonth._sum.amount ?? 0),
      incidenciasCobro: incidents,
      productosVendidos: unitsSold._sum.quantity ?? 0,
      clientesCompradores: buyerCount.length,
      ventasPorMetodoPago: salesByMethod.map((row) => ({ paymentMethod: row.paymentMethod, amount: Number(row._sum.amount ?? 0) })),
      pedidosPorEstado: ordersByStatus.map((row) => ({ status: row.orderStatus, count: row._count })),
      entregasPorEstado: deliveriesByStatus.map((row) => ({ status: row.deliveryStatus, count: row._count })),
      topProductos: topProducts.map((row) => ({
        productId: row.productId,
        name: productNameMap.get(row.productId) ?? 'Producto eliminado',
        unitsSold: row._sum.quantity ?? 0,
        amount: Number(row._sum.subtotal ?? 0),
      })),
      topClientes: topCustomersRaw.map((row) => ({
        customerId: row.customerId,
        fullName: customerNameMap.get(row.customerId) ?? 'Cliente eliminado',
        orders: row._count,
        amount: Number(row._sum.totalAmount ?? 0),
      })),
      liquidacionesRecientes: recentSettlements.map((settlement) => ({
        id: settlement.id,
        settlementNumber: settlement.settlementNumber,
        settlementDate: settlement.settlementDate,
        status: settlement.status,
        totalAmount: Number(settlement.totalAmount),
      })),
    };
  }

  async getSales(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();

    const where: Prisma.StoreOrderWhereInput = {
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(query.orderStatus?.trim() ? { orderStatus: query.orderStatus.trim() } : {}),
      ...(query.paymentStatus?.trim() ? { clientPaymentStatus: query.paymentStatus.trim() } : {}),
      ...(query.deliveryStatus?.trim() ? { deliveryStatus: query.deliveryStatus.trim() } : {}),
      ...(query.paymentMethod?.trim() ? { paymentMethodRequested: query.paymentMethod.trim() } : {}),
      ...(query.clientId?.trim() ? { customerId: query.clientId.trim() } : {}),
      ...(search ? { OR: this.orderSearchOr(search) } : {}),
    };

    const [orders, total, metricsRows] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { customer: { select: customerSelect } },
      }),
      this.prisma.storeOrder.count({ where }),
      this.prisma.storeOrder.groupBy({ by: ['orderStatus'], where, _count: true, _sum: { totalAmount: true } }),
    ]);

    const [confirmedAmount, confirmedCount] = await Promise.all([
      this.prisma.storeOrder.aggregate({ where: { ...where, clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO }, _sum: { totalAmount: true } }),
      this.prisma.storeOrder.count({ where: { ...where, clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO } }),
    ]);

    const statusCount = (status: string) => metricsRows.find((row) => row.orderStatus === status)?._count ?? 0;

    return {
      data: orders.map((order) => this.toSaleDto(order)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        totalVendido: Number(confirmedAmount._sum.totalAmount ?? 0),
        cantidadPedidos: total,
        ticketPromedio: confirmedCount > 0 ? Number(confirmedAmount._sum.totalAmount ?? 0) / confirmedCount : 0,
        pedidosSolicitados: statusCount(STORE_ORDER_STATUS.PEDIDO_SOLICITADO),
        pedidosConfirmados: statusCount(STORE_ORDER_STATUS.CONFIRMADO_ADMIN),
        pedidosEntregados: statusCount(STORE_ORDER_STATUS.ENTREGADO),
        pedidosCancelados: statusCount(STORE_ORDER_STATUS.CANCELADO),
        pedidosNoEntregados: statusCount(STORE_ORDER_STATUS.NO_ENTREGADO),
      },
    };
  }

  async getPayments(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();

    const where: Prisma.StoreOrderPaymentWhereInput = {
      ...(dateFilter ? { paidAt: dateFilter } : {}),
      ...(query.paymentMethod?.trim() ? { paymentMethod: query.paymentMethod.trim() } : {}),
      ...(query.paymentStatus?.trim() ? { paymentStatus: query.paymentStatus.trim() } : {}),
      ...(query.settlementStatus?.trim() ? { settlementStatus: query.settlementStatus.trim() } : {}),
      ...(query.driverId?.trim() ? { receivedByDriverId: query.driverId.trim() } : {}),
      ...(query.clientId?.trim() ? { order: { customerId: query.clientId.trim() } } : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { authorizationCode: { contains: search, mode: 'insensitive' } },
              { voucherNumber: { contains: search, mode: 'insensitive' } },
              { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
              { order: { customer: { fullName: { contains: search, mode: 'insensitive' } } } },
              { order: { customer: { email: { contains: search, mode: 'insensitive' } } } },
              { order: { customer: { phone: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [payments, total, statusGroups, settlementGroups] = await Promise.all([
      this.prisma.storeOrderPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { order: { select: { id: true, orderNumber: true, customer: { select: customerSelect } } } },
      }),
      this.prisma.storeOrderPayment.count({ where }),
      this.prisma.storeOrderPayment.groupBy({ by: ['paymentStatus'], where, _count: true, _sum: { amount: true } }),
      this.prisma.storeOrderPayment.groupBy({ by: ['settlementStatus'], where, _count: true }),
    ]);

    const statusAmount = (status: string) => Number(statusGroups.find((row) => row.paymentStatus === status)?._sum.amount ?? 0);
    const statusCount = (status: string) => statusGroups.find((row) => row.paymentStatus === status)?._count ?? 0;
    const settlementCount = (status: string) => settlementGroups.find((row) => row.settlementStatus === status)?._count ?? 0;

    return {
      data: payments.map((payment) => this.toPaymentDto(payment)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        totalConfirmados: statusCount(STORE_PAYMENT_STATUS.PAGO_CONFIRMADO),
        montoConfirmado: statusAmount(STORE_PAYMENT_STATUS.PAGO_CONFIRMADO),
        pendienteDePago: statusCount(STORE_PAYMENT_STATUS.PENDIENTE_PAGO),
        pendienteDeConfirmacion:
          statusCount(STORE_PAYMENT_STATUS.PENDIENTE_CONFIRMACION) +
          statusCount(STORE_PAYMENT_STATUS.PENDIENTE_LINK) +
          statusCount(STORE_PAYMENT_STATUS.LINK_ENVIADO),
        rechazadosNoPagados:
          statusCount(STORE_PAYMENT_STATUS.PAGO_RECHAZADO) +
          statusCount(STORE_PAYMENT_STATUS.NO_PAGADO) +
          statusCount(STORE_PAYMENT_STATUS.ANULADO),
        pendienteLiquidar: settlementCount(STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR),
        liquidado: settlementCount(STORE_SETTLEMENT_STATUS.LIQUIDADO),
        conIncidencia: settlementCount(STORE_SETTLEMENT_STATUS.CON_INCIDENCIA),
      },
    };
  }

  async getSettlements(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();

    const where: Prisma.StorePaymentSettlementWhereInput = {
      ...(dateFilter ? { settlementDate: dateFilter } : {}),
      ...(query.settlementStatus?.trim() ? { status: query.settlementStatus.trim() } : {}),
      ...(query.paymentMethod?.trim() ? { paymentMethod: query.paymentMethod.trim() } : {}),
      ...(search ? { OR: [{ settlementNumber: { contains: search, mode: 'insensitive' } }, { reference: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [settlements, total, statusGroups, pendingLiquidar, paidLiquidados, incidents] = await Promise.all([
      this.prisma.storePaymentSettlement.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.storePaymentSettlement.count({ where }),
      this.prisma.storePaymentSettlement.groupBy({ by: ['status'], where, _count: true, _sum: { totalAmount: true } }),
      this.prisma.storeOrderPayment.aggregate({ where: { settlementStatus: STORE_SETTLEMENT_STATUS.PENDIENTE_LIQUIDAR }, _sum: { amount: true } }),
      this.prisma.storeOrderPayment.count({ where: { settlementStatus: STORE_SETTLEMENT_STATUS.LIQUIDADO } }),
      this.prisma.storeOrderPayment.count({ where: { settlementStatus: STORE_SETTLEMENT_STATUS.CON_INCIDENCIA } }),
    ]);

    const userIds = Array.from(new Set(settlements.map((settlement) => settlement.createdByInternalUserId).filter((id): id is string => Boolean(id))));
    const users = userIds.length ? await this.prisma.internalUser.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
    const userNames = new Map(users.map((user) => [user.id, user.fullName]));

    const activeRow = statusGroups.find((row) => row.status === STORE_PAYMENT_SETTLEMENT_STATUS.ACTIVA);
    const annulledRow = statusGroups.find((row) => row.status === STORE_PAYMENT_SETTLEMENT_STATUS.ANULADA);

    return {
      data: settlements.map((settlement) => ({
        id: settlement.id,
        settlementNumber: settlement.settlementNumber,
        settlementDate: settlement.settlementDate,
        status: settlement.status,
        totalPayments: settlement.totalPayments,
        totalAmount: Number(settlement.totalAmount),
        paymentMethod: settlement.paymentMethod,
        reference: settlement.reference,
        createdByName: settlement.createdByInternalUserId ? userNames.get(settlement.createdByInternalUserId) ?? null : null,
        createdAt: settlement.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        totalLiquidado: Number(activeRow?._sum.totalAmount ?? 0),
        cantidadLiquidaciones: total,
        liquidacionesActivas: activeRow?._count ?? 0,
        liquidacionesAnuladas: annulledRow?._count ?? 0,
        pagosLiquidados: paidLiquidados,
        montoAnulado: Number(annulledRow?._sum.totalAmount ?? 0),
        pendienteLiquidar: Number(pendingLiquidar._sum.amount ?? 0),
        incidencias: incidents,
      },
    };
  }

  async getDeliveries(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();

    const where: Prisma.StoreOrderWhereInput = {
      ...(dateFilter ? { confirmedDeliveryDate: dateFilter } : {}),
      ...(query.deliveryStatus?.trim() ? { deliveryStatus: query.deliveryStatus.trim() } : {}),
      ...(query.driverId?.trim() ? { assignedDriverId: query.driverId.trim() } : {}),
      ...(search ? { OR: this.orderSearchOr(search) } : {}),
    };

    const [orders, total, statusGroups] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        orderBy: { confirmedDeliveryDate: 'desc' },
        skip,
        take: limit,
        include: { customer: { select: customerSelect }, assignedDriver: { select: driverSelect } },
      }),
      this.prisma.storeOrder.count({ where }),
      this.prisma.storeOrder.groupBy({ by: ['deliveryStatus'], where, _count: true }),
    ]);

    const orderIds = orders.map((order) => order.id);
    const timelineEntries = orderIds.length
      ? await this.prisma.storeOrderTimeline.findMany({
          where: { orderId: { in: orderIds }, statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS, newStatus: { in: [STORE_DELIVERY_STATUS.ENTREGADA, STORE_DELIVERY_STATUS.NO_ENTREGADA] } },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const lastDeliveredAt = new Map<string, Date>();
    const lastFailureComment = new Map<string, string | null>();
    for (const entry of timelineEntries) {
      if (entry.newStatus === STORE_DELIVERY_STATUS.ENTREGADA && !lastDeliveredAt.has(entry.orderId)) {
        lastDeliveredAt.set(entry.orderId, entry.createdAt);
      }
      if (entry.newStatus === STORE_DELIVERY_STATUS.NO_ENTREGADA && !lastFailureComment.has(entry.orderId)) {
        lastFailureComment.set(entry.orderId, entry.comment);
      }
    }

    const deliveredEntries = await this.prisma.storeOrderTimeline.findMany({
      where: { statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.DELIVERY_STATUS, newStatus: STORE_DELIVERY_STATUS.ENTREGADA, order: where },
      select: { orderId: true, createdAt: true, order: { select: { createdAt: true } } },
    });
    const averageDeliveryHours = deliveredEntries.length
      ? deliveredEntries.reduce((sum, entry) => sum + (entry.createdAt.getTime() - entry.order.createdAt.getTime()) / 3_600_000, 0) / deliveredEntries.length
      : null;

    const statusCount = (status: string) => statusGroups.find((row) => row.deliveryStatus === status)?._count ?? 0;

    return {
      data: orders.map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        driver: order.assignedDriver,
        confirmedDeliveryDate: order.confirmedDeliveryDate,
        deliveryTimeRange: order.deliveryTimeRange,
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.orderStatus,
        deliveredAt: lastDeliveredAt.get(order.id) ?? null,
        failureReason: lastFailureComment.get(order.id) ?? null,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        programadas: statusCount(STORE_DELIVERY_STATUS.PROGRAMADA),
        asignadas: statusCount(STORE_DELIVERY_STATUS.ASIGNADA),
        enRuta: statusCount(STORE_DELIVERY_STATUS.EN_RUTA),
        entregadas: statusCount(STORE_DELIVERY_STATUS.ENTREGADA),
        noEntregadas: statusCount(STORE_DELIVERY_STATUS.NO_ENTREGADA),
        reprogramadas: statusCount(STORE_DELIVERY_STATUS.REPROGRAMADA),
        canceladas: statusCount(STORE_DELIVERY_STATUS.CANCELADA),
        tiempoPromedioEntregaHoras: averageDeliveryHours,
      },
    };
  }

  async getProducts(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();

    const orderFilter: Prisma.StoreOrderWhereInput = {
      clientPaymentStatus: STORE_PAYMENT_STATUS.PAGO_CONFIRMADO,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    const salesGroups = await this.prisma.storeOrderItem.groupBy({
      by: ['productId'],
      where: { order: orderFilter },
      _sum: { quantity: true, subtotal: true },
      _count: true,
    });
    const salesByProduct = new Map(salesGroups.map((row) => [row.productId, row]));

    const productWhere: Prisma.StoreProductWhereInput = {
      ...(query.brandId?.trim() ? { brandId: query.brandId.trim() } : {}),
      ...(query.productId?.trim() ? { id: query.productId.trim() } : {}),
      ...(query.status?.trim() === 'ACTIVO' ? { isActive: true } : {}),
      ...(query.status?.trim() === 'INACTIVO' ? { isActive: false } : {}),
      ...(query.isVisible?.trim() === 'true' ? { isVisibleInStore: true } : {}),
      ...(query.isVisible?.trim() === 'false' ? { isVisibleInStore: false } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { brand: { name: { contains: search, mode: 'insensitive' } } }] } : {}),
    };

    // TODO produccion: optimizar esta consulta para paginacion/aggregate en base de datos antes de alto volumen.
    const allProducts = await this.prisma.storeProduct.findMany({ where: productWhere, include: { brand: { select: { id: true, name: true } } } });

    const enriched = allProducts.map((product) => {
      const sales = salesByProduct.get(product.id);
      return {
        productId: product.id,
        name: product.name,
        brand: product.brand.name,
        sku: product.sku,
        unitsSold: sales?._sum.quantity ?? 0,
        amountSold: Number(sales?._sum.subtotal ?? 0),
        ordersCount: sales?._count ?? 0,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        isVisibleInStore: product.isVisibleInStore,
      };
    });

    enriched.sort((a, b) => b.unitsSold - a.unitsSold);
    const total = enriched.length;
    const page$ = enriched.slice(skip, skip + limit);

    const unitsSoldTotal = enriched.reduce((sum, row) => sum + row.unitsSold, 0);
    const amountSoldTotal = enriched.reduce((sum, row) => sum + row.amountSold, 0);
    const withSales = enriched.filter((row) => row.unitsSold > 0);
    const mostSold = withSales.length ? withSales.reduce((best, row) => (row.unitsSold > best.unitsSold ? row : best)) : null;
    const mostRevenue = withSales.length ? withSales.reduce((best, row) => (row.amountSold > best.amountSold ? row : best)) : null;
    const lowStock = allProducts.filter((product) => product.minimumStock != null && product.stockQuantity <= product.minimumStock).length;

    return {
      data: page$,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        productosVendidos: withSales.length,
        unidadesVendidas: unitsSoldTotal,
        montoVendido: amountSoldTotal,
        productoMasVendido: mostSold ? { name: mostSold.name, unitsSold: mostSold.unitsSold } : null,
        productoMayorIngreso: mostRevenue ? { name: mostRevenue.name, amountSold: mostRevenue.amountSold } : null,
        productosSinVenta: enriched.length - withSales.length,
        productosBajoStock: lowStock,
      },
    };
  }

  async getCustomers(query: ReportQuery = {}) {
    const { page, limit, skip } = this.parsePagination(query);
    const { dateFrom, dateTo } = this.parseDateRange(query);
    const dateFilter = this.dateRangeFilter(dateFrom, dateTo);
    const search = query.search?.trim();
    const minAmount = query.minAmount?.trim() ? Number(query.minAmount.trim()) : undefined;
    const minOrders = query.minOrders?.trim() ? Number(query.minOrders.trim()) : undefined;

    const orderWhere: Prisma.StoreOrderWhereInput = {
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(search
        ? {
            customer: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    // TODO produccion: optimizar esta consulta para paginacion/aggregate en base de datos antes de alto volumen.
    const groups = await this.prisma.storeOrder.groupBy({
      by: ['customerId'],
      where: orderWhere,
      _count: true,
      _max: { createdAt: true },
    });

    const customerIds = groups.map((row) => row.customerId);
    if (customerIds.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 1 }, metrics: this.emptyCustomerMetrics() };
    }

    const [customers, allOrdersForGroup] = await Promise.all([
      this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: customerSelect }),
      this.prisma.storeOrder.findMany({ where: { customerId: { in: customerIds }, ...(dateFilter ? { createdAt: dateFilter } : {}) }, select: { customerId: true, orderStatus: true, clientPaymentStatus: true, totalAmount: true } }),
    ]);
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    const perCustomer = new Map<string, { orders: number; delivered: number; cancelledOrNotDelivered: number; amount: number }>();
    for (const order of allOrdersForGroup) {
      const entry = perCustomer.get(order.customerId) ?? { orders: 0, delivered: 0, cancelledOrNotDelivered: 0, amount: 0 };
      entry.orders += 1;
      if (order.orderStatus === STORE_ORDER_STATUS.ENTREGADO) entry.delivered += 1;
      if (order.orderStatus === STORE_ORDER_STATUS.CANCELADO || order.orderStatus === STORE_ORDER_STATUS.NO_ENTREGADO) entry.cancelledOrNotDelivered += 1;
      if (order.clientPaymentStatus === STORE_PAYMENT_STATUS.PAGO_CONFIRMADO) entry.amount += Number(order.totalAmount);
      perCustomer.set(order.customerId, entry);
    }

    const lastOrderMap = new Map(groups.map((row) => [row.customerId, row._max.createdAt]));

    let rows = customerIds
      .map((customerId) => {
        const customer = customerMap.get(customerId);
        const stats = perCustomer.get(customerId) ?? { orders: 0, delivered: 0, cancelledOrNotDelivered: 0, amount: 0 };
        return {
          customerId,
          fullName: customer?.fullName ?? 'Cliente eliminado',
          email: customer?.email ?? null,
          phone: customer?.phone ?? null,
          ordersCount: stats.orders,
          deliveredCount: stats.delivered,
          cancelledOrNotDeliveredCount: stats.cancelledOrNotDelivered,
          totalAmountPurchased: stats.amount,
          lastOrderAt: lastOrderMap.get(customerId) ?? null,
        };
      })
      .filter((row) => (minAmount != null ? row.totalAmountPurchased >= minAmount : true))
      .filter((row) => (minOrders != null ? row.ordersCount >= minOrders : true));

    rows = rows.sort((a, b) => b.totalAmountPurchased - a.totalAmountPurchased);

    const total = rows.length;
    const page$ = rows.slice(skip, skip + limit);

    const buyers = rows.length;
    const withDelivered = rows.filter((row) => row.deliveredCount > 0).length;
    const withPending = rows.filter((row) => row.ordersCount > row.deliveredCount + row.cancelledOrNotDeliveredCount).length;
    const recurring = rows.filter((row) => row.ordersCount >= 2).length;
    const totalAmount = rows.reduce((sum, row) => sum + row.totalAmountPurchased, 0);

    return {
      data: page$,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        clientesCompradores: buyers,
        clientesConEntregados: withDelivered,
        clientesConPendientes: withPending,
        clientesRecurrentes: recurring,
        montoTotalComprado: totalAmount,
        ticketPromedioPorCliente: buyers > 0 ? totalAmount / buyers : 0,
      },
    };
  }

  async exportCsv(report: string, query: ReportQuery = {}) {
    const limitedQuery = { ...query, page: '1', pageSize: '5000', limit: '5000' };

    switch (report) {
      case 'sales': {
        const result = await this.getSales(limitedQuery);
        const header = ['No. pedido', 'Fecha', 'Cliente', 'Metodo de pago', 'Estado pedido', 'Estado pago', 'Estado entrega', 'Subtotal', 'Total'];
        const rows = result.data.map((row) => [row.orderNumber, row.createdAt, row.customer.fullName, row.paymentMethodRequested, row.orderStatus, row.clientPaymentStatus, row.deliveryStatus, row.subtotalAmount, row.totalAmount]);
        return this.toCsv(header, rows);
      }
      case 'payments': {
        const result = await this.getPayments(limitedQuery);
        const header = ['No. pedido', 'Cliente', 'Metodo de pago', 'Monto', 'Estado pago', 'Estado liquidacion', 'Referencia', 'Autorizacion', 'Fecha de pago'];
        const rows = result.data.map((row) => [row.orderNumber, row.customer?.fullName ?? '', row.paymentMethod, row.amount, row.paymentStatus, row.settlementStatus, row.referenceNumber ?? '', row.authorizationCode ?? '', row.paidAt ?? '']);
        return this.toCsv(header, rows);
      }
      case 'settlements': {
        const result = await this.getSettlements(limitedQuery);
        const header = ['No. liquidacion', 'Fecha', 'Estado', 'Cantidad de pagos', 'Monto total', 'Metodos incluidos', 'Referencia', 'Creado por'];
        const rows = result.data.map((row) => [row.settlementNumber, row.settlementDate, row.status, row.totalPayments, row.totalAmount, row.paymentMethod ?? 'Mixto', row.reference ?? '', row.createdByName ?? '']);
        return this.toCsv(header, rows);
      }
      case 'deliveries': {
        const result = await this.getDeliveries(limitedQuery);
        const header = ['No. pedido', 'Cliente', 'Mensajero', 'Fecha programada', 'Rango horario', 'Estado entrega', 'Estado pedido', 'Fecha entrega', 'Motivo no entrega'];
        const rows = result.data.map((row) => [row.orderNumber, row.customer.fullName, row.driver?.fullName ?? '', row.confirmedDeliveryDate ?? '', row.deliveryTimeRange ?? '', row.deliveryStatus, row.orderStatus, row.deliveredAt ?? '', row.failureReason ?? '']);
        return this.toCsv(header, rows);
      }
      case 'products': {
        const result = await this.getProducts(limitedQuery);
        const header = ['Producto', 'Marca', 'SKU', 'Unidades vendidas', 'Monto vendido', 'Pedidos', 'Stock actual', 'Activo', 'Visible'];
        const rows = result.data.map((row) => [row.name, row.brand, row.sku ?? '', row.unitsSold, row.amountSold, row.ordersCount, row.stockQuantity, row.isActive ? 'Si' : 'No', row.isVisibleInStore ? 'Si' : 'No']);
        return this.toCsv(header, rows);
      }
      case 'customers': {
        const result = await this.getCustomers(limitedQuery);
        const header = ['Cliente', 'Correo', 'Telefono', 'Cantidad de pedidos', 'Pedidos entregados', 'Cancelados/no entregados', 'Monto total comprado', 'Ultimo pedido'];
        const rows = result.data.map((row) => [row.fullName, row.email ?? '', row.phone ?? '', row.ordersCount, row.deliveredCount, row.cancelledOrNotDeliveredCount, row.totalAmountPurchased, row.lastOrderAt ?? '']);
        return this.toCsv(header, rows);
      }
      default:
        return this.toCsv(['Reporte no encontrado'], []);
    }
  }

  private emptyCustomerMetrics() {
    return { clientesCompradores: 0, clientesConEntregados: 0, clientesConPendientes: 0, clientesRecurrentes: 0, montoTotalComprado: 0, ticketPromedioPorCliente: 0 };
  }

  private orderSearchOr(search: string): Prisma.StoreOrderWhereInput[] {
    return [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
      { assignedDriver: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  private toSaleDto(order: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    customer: { id: string; fullName: string; phone: string; email: string | null; code: string };
    paymentMethodRequested: string;
    orderStatus: string;
    clientPaymentStatus: string;
    deliveryStatus: string;
    subtotalAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
  }) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customer: order.customer,
      paymentMethodRequested: order.paymentMethodRequested,
      orderStatus: order.orderStatus,
      clientPaymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
      subtotalAmount: Number(order.subtotalAmount),
      totalAmount: Number(order.totalAmount),
    };
  }

  private toPaymentDto(payment: {
    id: string;
    orderId: string;
    paymentMethod: string;
    paymentStatus: string;
    settlementStatus: string;
    settlementId: string | null;
    amount: Prisma.Decimal;
    referenceNumber: string | null;
    authorizationCode: string | null;
    voucherNumber: string | null;
    paidAt: Date | null;
    receiptFileUrl: string | null;
    receiptFileName: string | null;
    order: { id: string; orderNumber: string; customer: { id: string; fullName: string; phone: string; email: string | null; code: string } };
  }) {
    return {
      paymentId: payment.id,
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      customer: payment.order.customer,
      paymentMethod: payment.paymentMethod,
      amount: Number(payment.amount),
      paymentStatus: payment.paymentStatus,
      settlementStatus: payment.settlementStatus,
      settlementId: payment.settlementId,
      referenceNumber: payment.referenceNumber,
      authorizationCode: payment.authorizationCode,
      voucherNumber: payment.voucherNumber,
      paidAt: payment.paidAt,
      receiptFileUrl: payment.receiptFileUrl,
      receiptFileName: payment.receiptFileName,
    };
  }

  private toCsv(header: string[], rows: Array<Array<unknown>>) {
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [header.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  }

  private parsePagination(query: ReportQuery) {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.pageSize ?? query.limit, 20), 200);
    return { page, limit, skip: (page - 1) * limit };
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseDateRange(query: ReportQuery) {
    return { dateFrom: this.parseOptionalDate(query.dateFrom), dateTo: this.parseOptionalDate(query.dateTo) };
  }

  private parseOptionalDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private dateRangeFilter(dateFrom?: Date, dateTo?: Date) {
    if (!dateFrom && !dateTo) return undefined;
    return { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) };
  }
}
