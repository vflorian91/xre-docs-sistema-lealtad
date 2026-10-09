-- CreateEnum
CREATE TYPE "RedemptionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'READY', 'DELIVERED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_pointMovementId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_validatedByInternalUserId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_validatedStoreId_fkey";

-- DropTable
DROP TABLE "Redemption";

-- DropTable
DROP TABLE "Reward";

-- DropEnum
DROP TYPE "RedemptionStatus";

-- CreateTable
CREATE TABLE "redeemable_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsValue" INTEGER NOT NULL,
    "stock" INTEGER,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "categoryItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishStartDate" TIMESTAMP(3),
    "publishEndDate" TIMESTAMP(3),
    "redemptionLimitPerCustomer" INTEGER,
    "termsConditions" TEXT,
    "createdByInternalUserId" TEXT,
    "updatedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redeemable_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_requests" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productPointsSnapshot" INTEGER NOT NULL,
    "pickupStoreId" TEXT NOT NULL,
    "pointMovementId" TEXT,
    "status" "RedemptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "pointsReserved" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "managedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redemption_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redeemable_products_code_key" ON "redeemable_products"("code");

-- CreateIndex
CREATE INDEX "redeemable_products_isActive_isFeatured_displayOrder_idx" ON "redeemable_products"("isActive", "isFeatured", "displayOrder");

-- CreateIndex
CREATE INDEX "redeemable_products_categoryItemId_idx" ON "redeemable_products"("categoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_requests_requestCode_key" ON "redemption_requests"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_requests_pointMovementId_key" ON "redemption_requests"("pointMovementId");

-- CreateIndex
CREATE INDEX "redemption_requests_customerId_requestedAt_idx" ON "redemption_requests"("customerId", "requestedAt");

-- CreateIndex
CREATE INDEX "redemption_requests_productId_idx" ON "redemption_requests"("productId");

-- CreateIndex
CREATE INDEX "redemption_requests_status_requestedAt_idx" ON "redemption_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "redemption_requests_pickupStoreId_requestedAt_idx" ON "redemption_requests"("pickupStoreId", "requestedAt");

-- AddForeignKey
ALTER TABLE "redeemable_products" ADD CONSTRAINT "redeemable_products_categoryItemId_fkey" FOREIGN KEY ("categoryItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "redeemable_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_pointMovementId_fkey" FOREIGN KEY ("pointMovementId") REFERENCES "PointMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_pickupStoreId_fkey" FOREIGN KEY ("pickupStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_managedByInternalUserId_fkey" FOREIGN KEY ("managedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

