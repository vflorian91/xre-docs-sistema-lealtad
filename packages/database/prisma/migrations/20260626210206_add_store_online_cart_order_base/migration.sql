-- CreateTable
CREATE TABLE "store_carts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subtotalAmount" DECIMAL(12,2) NOT NULL,
    "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethodRequested" TEXT NOT NULL,
    "clientPaymentStatus" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'PEDIDO_SOLICITADO',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDIENTE_PROGRAMACION',
    "suggestedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "confirmedDeliveryDate" TIMESTAMP(3),
    "deliveryTimeRange" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryDepartmentId" TEXT,
    "deliveryMunicipalityId" TEXT,
    "deliveryZoneId" TEXT,
    "deliveryReference" TEXT,
    "deliveryPhone" TEXT NOT NULL,
    "receiverName" TEXT,
    "assignedDriverId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "brandNameSnapshot" TEXT NOT NULL,
    "productImageSnapshot" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_timeline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "statusType" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "comment" TEXT,
    "createdByInternalUserId" TEXT,
    "createdByClientId" TEXT,
    "createdByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_order_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "visaLinkUrl" TEXT,
    "visaLinkSentAt" TIMESTAMP(3),
    "visaLinkSentByInternalUserId" TEXT,
    "authorizationCode" TEXT,
    "voucherNumber" TEXT,
    "referenceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "confirmedByInternalUserId" TEXT,
    "receivedByDriverId" TEXT,
    "notes" TEXT,
    "settlementStatus" TEXT NOT NULL DEFAULT 'NO_APLICA',
    "settlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_number_sequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_order_number_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_carts_customerId_status_idx" ON "store_carts"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "store_cart_items_cartId_productId_key" ON "store_cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_orderNumber_key" ON "store_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "store_orders_customerId_createdAt_idx" ON "store_orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "store_orders_orderStatus_idx" ON "store_orders"("orderStatus");

-- CreateIndex
CREATE INDEX "store_order_items_orderId_idx" ON "store_order_items"("orderId");

-- CreateIndex
CREATE INDEX "store_order_items_brandId_idx" ON "store_order_items"("brandId");

-- CreateIndex
CREATE INDEX "store_order_timeline_orderId_createdAt_idx" ON "store_order_timeline"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "store_order_payments_orderId_idx" ON "store_order_payments"("orderId");

-- CreateIndex
CREATE INDEX "store_order_payments_paymentStatus_idx" ON "store_order_payments"("paymentStatus");

-- AddForeignKey
ALTER TABLE "store_carts" ADD CONSTRAINT "store_carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_cart_items" ADD CONSTRAINT "store_cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "store_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_cart_items" ADD CONSTRAINT "store_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "store_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_timeline" ADD CONSTRAINT "store_order_timeline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_payments" ADD CONSTRAINT "store_order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
