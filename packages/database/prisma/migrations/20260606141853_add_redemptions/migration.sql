-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'VALIDATED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointMovementId" TEXT,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "pointsCost" INTEGER NOT NULL,
    "validatedStoreId" TEXT,
    "validatedByInternalUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_code_key" ON "Redemption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_pointMovementId_key" ON "Redemption"("pointMovementId");

-- CreateIndex
CREATE INDEX "Redemption_customerId_requestedAt_idx" ON "Redemption"("customerId", "requestedAt");

-- CreateIndex
CREATE INDEX "Redemption_rewardId_idx" ON "Redemption"("rewardId");

-- CreateIndex
CREATE INDEX "Redemption_status_requestedAt_idx" ON "Redemption"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "Redemption_validatedStoreId_validatedAt_idx" ON "Redemption"("validatedStoreId", "validatedAt");

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_pointMovementId_fkey" FOREIGN KEY ("pointMovementId") REFERENCES "PointMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_validatedStoreId_fkey" FOREIGN KEY ("validatedStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_validatedByInternalUserId_fkey" FOREIGN KEY ("validatedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
