import { createHmac } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerAuthUser } from '../../auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { CustomerAddressService } from '../../customer-address/customer-address.service';
import { StoreOrderNumberService } from './store-order-number.service';
import { StoreOrderTimelineService } from './store-order-timeline.service';
import { CheckoutPreviewInput, CreateStoreOrderInput } from './store-order.schemas';
import { groupItemsByBrand } from './store-brand-grouping';
import {
  STORE_CLIENT_VISIBLE_LABELS,
  STORE_DELIVERY_STATUS,
  STORE_ORDER_STATUS,
  STORE_ORDER_TIMELINE_STATUS_TYPE,
  STORE_SETTLEMENT_STATUS,
  STORE_TIMELINE_ROLE,
  initialPaymentStatusForMethod,
  mapClientVisibleStatus,
} from './store-order.constants';

const cartItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  quantity: true,
  unitPriceSnapshot: true,
  variant: {
    select: {
      id: true,
      sku: true,
      optionLabel: true,
      optionValues: true,
      price: true,
      promotionalPrice: true,
      stockQuantity: true,
      isActive: true,
    },
  },
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      mainImageUrl: true,
      price: true,
      stockQuantity: true,
      isActive: true,
      brandId: true,
      brand: { select: { id: true, name: true, isActive: true, logoUrl: true } },
    },
  },
};

@Injectable()
export class StoreOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNumberService: StoreOrderNumberService,
    private readonly timelineService: StoreOrderTimelineService,
    private readonly customerAddressService: CustomerAddressService,
  ) {}

  async createOrder(customer: CustomerAuthUser, input: CreateStoreOrderInput) {
    // El cliente ya no propone fecha de entrega; la define administración al programar.
    // Se registra la fecha de solicitud como referencia interna.
    const requestedAt = new Date();

    const cart = await this.prisma.storeCart.findFirst({ where: { customerId: customer.id, status: 'ACTIVE' } });
    if (!cart) {
      throw new BadRequestException('No puedes solicitar un pedido con el carrito vacio.');
    }

    const allItems = await this.prisma.storeCartItem.findMany({ where: { cartId: cart.id }, select: cartItemSelect });
    if (allItems.length === 0) {
      throw new BadRequestException('No puedes solicitar un pedido con el carrito vacio.');
    }

    // Fase 5 — Pedido maestro multi-marca. Si llegan marcas seleccionadas, el pedido se arma
    // solo con esos ítems; el resto permanece en el carrito. Si no, se usa todo el carrito.
    const isBrandSelection = Array.isArray(input.selectedBrandIds) && input.selectedBrandIds.length > 0;
    let items = allItems;

    if (isBrandSelection) {
      const selectedBrandIds = [...new Set(input.selectedBrandIds)];
      const cartBrandIds = new Set(allItems.map((item) => item.product.brandId));
      const unknownBrand = selectedBrandIds.find((brandId) => !cartBrandIds.has(brandId));
      if (unknownBrand) {
        throw new BadRequestException('Una o mas marcas seleccionadas no estan en tu carrito.');
      }
      const selectedSet = new Set(selectedBrandIds);
      items = allItems.filter((item) => selectedSet.has(item.product.brandId));
      if (items.length === 0) {
        throw new BadRequestException('No puedes solicitar un pedido con el carrito vacio.');
      }
    }

    for (const item of items) {
      const { product } = item;
      if (!product.isActive || !product.brand.isActive) {
        throw new BadRequestException('Uno o mas productos de tu carrito ya no estan disponibles. Revisa tu carrito antes de continuar.');
      }
      if (item.variantId && (!item.variant || !item.variant.isActive)) {
        throw new BadRequestException('Una o mas variantes de tu carrito ya no estan disponibles. Revisa tu carrito antes de continuar.');
      }
      const availableStock = item.variant?.stockQuantity ?? product.stockQuantity;
      if (item.quantity > availableStock) {
        throw new BadRequestException('Uno o mas productos no cuentan con stock suficiente.');
      }
    }

    const subtotalAmount = items.reduce((sum, item) => sum + this.itemUnitPrice(item) * item.quantity, 0);
    const totalAmount = subtotalAmount;
    const initialPaymentStatus = initialPaymentStatusForMethod(input.paymentMethodRequested);

    // Resuelve la direccion de entrega: desde la libreta (si se envia customerAddressId)
    // o desde los campos escritos a mano (compatibilidad con el flujo actual).
    let deliveryAddress = input.deliveryAddress?.trim();
    let deliveryPhone = input.deliveryPhone;
    let deliveryReference = input.deliveryReference ?? null;
    let customerAddressId: string | null = null;
    let deliveryAddressSnapshot: Prisma.InputJsonValue | undefined;

    if (input.customerAddressId) {
      const address = await this.customerAddressService.getActiveForCheckout(customer.id, input.customerAddressId);
      customerAddressId = address.id;
      deliveryAddress = address.addressLine;
      deliveryReference = address.reference ?? null;
      deliveryPhone = address.contactPhone;
      deliveryAddressSnapshot = {
        label: address.label,
        department: address.department,
        municipality: address.municipality,
        zone: address.zone ?? null,
        addressLine: address.addressLine,
        reference: address.reference ?? null,
        contactPhone: address.contactPhone,
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      };
    }

    if (!deliveryAddress || !deliveryPhone) {
      throw new BadRequestException('Debes indicar una direccion de entrega y un telefono de contacto.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.orderNumberService.nextOrderNumber(tx);

      const createdOrder = await tx.storeOrder.create({
        data: {
          orderNumber,
          customerId: customer.id,
          subtotalAmount,
          shippingAmount: 0,
          totalAmount,
          paymentMethodRequested: input.paymentMethodRequested,
          clientPaymentStatus: initialPaymentStatus,
          orderStatus: STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
          deliveryStatus: STORE_DELIVERY_STATUS.PENDIENTE_PROGRAMACION,
          suggestedDeliveryDate: requestedAt,
          deliveryAddress,
          deliveryDepartmentId: input.deliveryDepartmentId ?? null,
          deliveryMunicipalityId: input.deliveryMunicipalityId ?? null,
          deliveryZoneId: input.deliveryZoneId ?? null,
          deliveryReference,
          deliveryPhone,
          receiverName: input.receiverName ?? null,
          customerAddressId,
          ...(deliveryAddressSnapshot ? { deliveryAddressSnapshot } : {}),
        },
      });

      await tx.storeOrderItem.createMany({
        data: items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          brandId: item.product.brandId,
          productNameSnapshot: item.product.name,
          variantLabelSnapshot: item.variant?.optionLabel ?? null,
          variantOptionsSnapshot: (item.variant?.optionValues ?? null) as Prisma.InputJsonValue,
          skuSnapshot: item.variant?.sku ?? item.product.sku ?? null,
          brandNameSnapshot: item.product.brand.name,
          productImageSnapshot: item.product.mainImageUrl,
          unitPrice: this.itemUnitPrice(item),
          quantity: item.quantity,
          subtotal: this.itemUnitPrice(item) * item.quantity,
        })),
      });

      await tx.storeOrderPayment.create({
        data: {
          orderId: createdOrder.id,
          paymentMethod: input.paymentMethodRequested,
          paymentStatus: initialPaymentStatus,
          amount: totalAmount,
          currency: 'GTQ',
          settlementStatus: STORE_SETTLEMENT_STATUS.NO_APLICA,
        },
      });

      const includedBrandNames = [...new Set(items.map((item) => item.product.brand.name))];
      const timelineComment = isBrandSelection
        ? `ORDER_CREATED_FROM_SELECTED_BRANDS · marcas: ${includedBrandNames.join(', ')} · ${items.length} producto(s) · total Q${totalAmount}`
        : `ORDER_CREATED_FROM_CART · Pedido solicitado por el cliente desde la PWA. · ${items.length} producto(s) · total Q${totalAmount}`;

      await this.timelineService.registerEvent(tx, {
        orderId: createdOrder.id,
        statusType: STORE_ORDER_TIMELINE_STATUS_TYPE.ORDER_STATUS,
        previousStatus: null,
        newStatus: STORE_ORDER_STATUS.PEDIDO_SOLICITADO,
        comment: timelineComment,
        createdByClientId: customer.id,
        createdByRole: STORE_TIMELINE_ROLE.CLIENT,
      });

      if (isBrandSelection) {
        // Solo se retiran del carrito los ítems comprados; el resto permanece activo.
        const purchasedItemIds = items.map((item) => item.id);
        await tx.storeCartItem.deleteMany({ where: { id: { in: purchasedItemIds } } });
        const remaining = await tx.storeCartItem.count({ where: { cartId: cart.id } });
        if (remaining === 0) {
          await tx.storeCart.update({ where: { id: cart.id }, data: { status: 'ORDERED' } });
        }
      } else {
        await tx.storeCart.update({ where: { id: cart.id }, data: { status: 'ORDERED' } });
      }

      return tx.storeOrder.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: { items: true, payments: true },
      });
    });

    return this.toOrderDetailDto(order);
  }

  async listOrders(customer: CustomerAuthUser) {
    const orders = await this.prisma.storeOrder.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { payments: true },
    });

    return orders.map((order) => this.toOrderSummaryDto(order));
  }

  async getOrder(customer: CustomerAuthUser, orderId: string) {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, timeline: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado.');
    }

    if (order.customerId !== customer.id) {
      throw new ForbiddenException('No tienes permiso para ver este pedido.');
    }

    return this.toOrderDetailDto(order);
  }

  /**
   * Fase 5 — Vista previa del checkout. No crea nada: resuelve los ítems (de las marcas
   * seleccionadas o de todo el carrito), recalcula totales desde el backend y agrupa por marca.
   */
  async buildCheckoutPreview(customer: CustomerAuthUser, input: CheckoutPreviewInput) {
    const cart = await this.prisma.storeCart.findFirst({ where: { customerId: customer.id, status: 'ACTIVE' } });
    if (!cart) {
      throw new BadRequestException('No tienes un carrito activo.');
    }

    const allItems = await this.prisma.storeCartItem.findMany({ where: { cartId: cart.id }, select: cartItemSelect });
    if (allItems.length === 0) {
      throw new BadRequestException('Tu carrito esta vacio.');
    }

    const isBrandSelection = Array.isArray(input.selectedBrandIds) && input.selectedBrandIds.length > 0;
    let items = allItems;
    if (isBrandSelection) {
      const selectedBrandIds = [...new Set(input.selectedBrandIds)];
      const cartBrandIds = new Set(allItems.map((item) => item.product.brandId));
      const unknownBrand = selectedBrandIds.find((brandId) => !cartBrandIds.has(brandId));
      if (unknownBrand) {
        throw new BadRequestException('Una o mas marcas seleccionadas no estan en tu carrito.');
      }
      const selectedSet = new Set(selectedBrandIds);
      items = allItems.filter((item) => selectedSet.has(item.product.brandId));
      if (items.length === 0) {
        throw new BadRequestException('Selecciona al menos un producto para continuar.');
      }
    }

    const dtoItems = items.map((item) => {
      const unitPrice = this.itemUnitPrice(item);
      const availableStock = item.variant?.stockQuantity ?? item.product.stockQuantity;
      const isAvailable = item.product.isActive && item.product.brand.isActive && (!item.variantId || Boolean(item.variant?.isActive)) && item.quantity <= availableStock;
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        brandId: item.product.brand.id,
        brandName: item.product.brand.name,
        brandLogoUrl: item.product.brand.logoUrl ?? null,
        productName: item.product.name,
        variantLabel: item.variant?.optionLabel ?? null,
        variantOptions: item.variant?.optionValues ?? null,
        sku: item.variant?.sku ?? item.product.sku ?? null,
        imageUrl: item.product.mainImageUrl,
        unitPrice,
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity,
        isAvailable,
      };
    });

    const subtotal = dtoItems.reduce((sum, item) => sum + item.subtotal, 0);
    const brandGroups = groupItemsByBrand(dtoItems).map((group) => ({
      brandId: group.brandId,
      brandName: group.brandName,
      brandLogoUrl: group.brandLogoUrl,
      subtotal: group.subtotal,
      totalItems: group.totalItems,
      items: group.items,
    }));

    let selectedAddress: Awaited<ReturnType<CustomerAddressService['getActiveForCheckout']>> | null = null;
    if (input.customerAddressId) {
      selectedAddress = await this.customerAddressService.getActiveForCheckout(customer.id, input.customerAddressId);
    }

    return {
      cartId: cart.id,
      isBrandSelection,
      brandGroups,
      items: dtoItems,
      totalItems: dtoItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shippingAmount: 0,
      total: subtotal,
      hasUnavailableItems: dtoItems.some((item) => !item.isAvailable),
      selectedAddress,
    };
  }

  private assertValidDeliveryDate(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const suggested = new Date(date);
    suggested.setHours(0, 0, 0, 0);

    if (suggested.getTime() <= today.getTime()) {
      throw new BadRequestException('La entrega no puede programarse para el mismo dia. Selecciona una fecha a partir de manana.');
    }
  }

  private latestPayment<T extends { createdAt: Date }>(payments: T[]): T | null {
    return [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  }

  private toPaymentDto(payment: {
    paymentMethod: string;
    paymentStatus: string;
    amount: Prisma.Decimal;
    currency: string;
    visaLinkUrl: string | null;
    paidAt: Date | null;
  } | null) {
    if (!payment) return null;
    return {
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      amount: Number(payment.amount),
      currency: payment.currency,
      visaLinkUrl: payment.visaLinkUrl,
      paidAt: payment.paidAt,
    };
  }

  private itemUnitPrice(item: {
    product: { price: Prisma.Decimal };
    variant?: { price: Prisma.Decimal; promotionalPrice: Prisma.Decimal | null } | null;
  }) {
    return Number(item.variant?.promotionalPrice ?? item.variant?.price ?? item.product.price);
  }

  private toOrderSummaryDto(order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    deliveryStatus: string;
    clientPaymentStatus: string;
    paymentMethodRequested: string;
    totalAmount: Prisma.Decimal;
    suggestedDeliveryDate: Date;
    confirmedDeliveryDate: Date | null;
    createdAt: Date;
    payments: Array<{ paymentMethod: string; paymentStatus: string; amount: Prisma.Decimal; currency: string; visaLinkUrl: string | null; paidAt: Date | null; createdAt: Date }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      clientPaymentStatus: order.clientPaymentStatus,
      ...this.clientVisibleFields(order),
      paymentMethodRequested: order.paymentMethodRequested,
      totalAmount: Number(order.totalAmount),
      suggestedDeliveryDate: order.suggestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      createdAt: order.createdAt,
      payment: this.toPaymentDto(this.latestPayment(order.payments)),
    };
  }

  private clientVisibleFields(order: { orderStatus: string; clientPaymentStatus: string; deliveryStatus: string }) {
    const clientVisibleStatus = mapClientVisibleStatus({
      orderStatus: order.orderStatus,
      paymentStatus: order.clientPaymentStatus,
      deliveryStatus: order.deliveryStatus,
    });
    return { clientVisibleStatus, clientVisibleLabel: STORE_CLIENT_VISIBLE_LABELS[clientVisibleStatus] };
  }

  private toOrderDetailDto(order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    deliveryStatus: string;
    clientPaymentStatus: string;
    paymentMethodRequested: string;
    subtotalAmount: Prisma.Decimal;
    shippingAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    suggestedDeliveryDate: Date;
    confirmedDeliveryDate: Date | null;
    deliveryTimeRange: string | null;
    deliveryAddress: string;
    deliveryReference: string | null;
    deliveryPhone: string;
    receiverName: string | null;
    deliveryCodeGeneratedAt?: Date | null;
    deliveryCodeValidatedAt?: Date | null;
    deliveryCodeStatus?: string | null;
    createdAt: Date;
    items: Array<{
      id: string;
      brandId: string | null;
      brandNameSnapshot: string;
      productNameSnapshot: string;
      variantLabelSnapshot?: string | null;
      variantOptionsSnapshot?: Prisma.JsonValue | null;
      skuSnapshot?: string | null;
      productImageSnapshot: string | null;
      unitPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
    }>;
    payments: Array<{ paymentMethod: string; paymentStatus: string; amount: Prisma.Decimal; currency: string; visaLinkUrl: string | null; paidAt: Date | null; createdAt: Date }>;
    timeline?: Array<{ statusType: string; previousStatus: string | null; newStatus: string; comment: string | null; createdByRole: string; createdAt: Date }>;
  }) {
    const dtoItems = order.items.map((item) => ({
      id: item.id,
      brandId: item.brandId ?? null,
      brandName: item.brandNameSnapshot,
      productName: item.productNameSnapshot,
      variantLabel: item.variantLabelSnapshot ?? null,
      variantOptions: item.variantOptionsSnapshot ?? null,
      sku: item.skuSnapshot ?? null,
      imageUrl: item.productImageSnapshot,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      clientPaymentStatus: order.clientPaymentStatus,
      ...this.clientVisibleFields(order),
      paymentMethodRequested: order.paymentMethodRequested,
      subtotalAmount: Number(order.subtotalAmount),
      shippingAmount: Number(order.shippingAmount),
      totalAmount: Number(order.totalAmount),
      suggestedDeliveryDate: order.suggestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      deliveryTimeRange: order.deliveryTimeRange,
      deliveryAddress: order.deliveryAddress,
      deliveryReference: order.deliveryReference,
      deliveryPhone: order.deliveryPhone,
      receiverName: order.receiverName,
      deliveryCode: this.clientDeliveryCode(order),
      deliveryCodeStatus: order.deliveryCodeStatus ?? null,
      deliveryCodeValidatedAt: order.deliveryCodeValidatedAt ?? null,
      createdAt: order.createdAt,
      items: dtoItems,
      // Fase 5 — agrupación por marca (aditiva); `items` plano se conserva arriba.
      brandGroups: groupItemsByBrand(dtoItems).map((group) => ({
        brandId: group.brandId,
        brandName: group.brandName,
        brandLogoUrl: group.brandLogoUrl,
        subtotal: group.subtotal,
        totalItems: group.totalItems,
        items: group.items,
      })),
      payment: this.toPaymentDto(this.latestPayment(order.payments)),
      timeline: (order.timeline ?? []).map((event) => ({
        statusType: event.statusType,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        comment: event.comment,
        createdAt: event.createdAt,
      })),
    };
  }

  private clientDeliveryCode(order: { id: string; deliveryStatus: string; deliveryCodeGeneratedAt?: Date | null; deliveryCodeValidatedAt?: Date | null }) {
    if (order.deliveryStatus !== STORE_DELIVERY_STATUS.EN_RUTA || !order.deliveryCodeGeneratedAt || order.deliveryCodeValidatedAt) return null;
    const secret = process.env.DELIVERY_CODE_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'local-delivery-code-secret';
    const digest = createHmac('sha256', secret).update(`${order.id}:${order.deliveryCodeGeneratedAt.toISOString()}`).digest('hex');
    const numeric = Number.parseInt(digest.slice(0, 12), 16) % 1_000_000;
    return String(numeric).padStart(6, '0');
  }
}
