-- AlterTable
ALTER TABLE "store_order_payments" ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settledByInternalUserId" TEXT;

-- CreateTable
CREATE TABLE "store_payment_settlements" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "totalPayments" INTEGER NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVA',
    "reference" TEXT,
    "comment" TEXT,
    "createdByInternalUserId" TEXT,
    "annulledByInternalUserId" TEXT,
    "annulledAt" TIMESTAMP(3),
    "annulmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_payment_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_payment_settlement_items" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "authorizationCode" TEXT,
    "voucherNumber" TEXT,
    "referenceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_payment_settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_payment_settlement_number_sequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_payment_settlement_number_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_payment_settlements_settlementNumber_key" ON "store_payment_settlements"("settlementNumber");

-- CreateIndex
CREATE INDEX "store_payment_settlements_settlementDate_idx" ON "store_payment_settlements"("settlementDate");

-- CreateIndex
CREATE INDEX "store_payment_settlements_paymentMethod_idx" ON "store_payment_settlements"("paymentMethod");

-- CreateIndex
CREATE INDEX "store_payment_settlements_status_idx" ON "store_payment_settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "store_payment_settlement_items_paymentId_key" ON "store_payment_settlement_items"("paymentId");

-- CreateIndex
CREATE INDEX "store_payment_settlement_items_settlementId_idx" ON "store_payment_settlement_items"("settlementId");

-- CreateIndex
CREATE INDEX "store_payment_settlement_items_orderId_idx" ON "store_payment_settlement_items"("orderId");

-- CreateIndex
CREATE INDEX "store_order_payments_settlementStatus_idx" ON "store_order_payments"("settlementStatus");

-- AddForeignKey
ALTER TABLE "store_order_payments" ADD CONSTRAINT "store_order_payments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "store_payment_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_payment_settlement_items" ADD CONSTRAINT "store_payment_settlement_items_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "store_payment_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_payment_settlement_items" ADD CONSTRAINT "store_payment_settlement_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "store_order_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_payment_settlement_items" ADD CONSTRAINT "store_payment_settlement_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
