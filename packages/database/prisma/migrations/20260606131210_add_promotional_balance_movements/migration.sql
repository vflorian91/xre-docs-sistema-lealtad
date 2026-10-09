-- CreateEnum
CREATE TYPE "PromotionalBalanceMovementType" AS ENUM ('ADMIN_CREDIT', 'POINT_CONVERSION', 'PURCHASE_USE', 'ADMIN_ADJUSTMENT_NEGATIVE', 'EXPIRED', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PromotionalBalanceMovementStatus" AS ENUM ('AVAILABLE', 'USED', 'REVERSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "PromotionalBalanceMovement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "type" "PromotionalBalanceMovementType" NOT NULL,
    "status" "PromotionalBalanceMovementStatus" NOT NULL DEFAULT 'AVAILABLE',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionalBalanceMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionalBalanceMovement_customerId_createdAt_idx" ON "PromotionalBalanceMovement"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionalBalanceMovement_purchaseId_idx" ON "PromotionalBalanceMovement"("purchaseId");

-- CreateIndex
CREATE INDEX "PromotionalBalanceMovement_status_expiresAt_idx" ON "PromotionalBalanceMovement"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "PromotionalBalanceMovement" ADD CONSTRAINT "PromotionalBalanceMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionalBalanceMovement" ADD CONSTRAINT "PromotionalBalanceMovement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
