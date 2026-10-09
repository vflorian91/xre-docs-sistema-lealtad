ALTER TABLE "store_orders"
  ADD COLUMN "deliveryCodeHash" TEXT,
  ADD COLUMN "deliveryCodeGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "deliveryCodeValidatedAt" TIMESTAMP(3),
  ADD COLUMN "deliveryCodeValidatedByDriverId" TEXT,
  ADD COLUMN "deliveryCodeFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryCodeStatus" TEXT;

CREATE INDEX "store_orders_deliveryCodeStatus_idx" ON "store_orders"("deliveryCodeStatus");
