ALTER TABLE "store_delivery_incidents"
  ADD COLUMN "affectedStoreId" TEXT,
  ADD COLUMN "affectedOrderItemId" TEXT;

CREATE INDEX "store_delivery_incidents_affectedStoreId_idx" ON "store_delivery_incidents"("affectedStoreId");
CREATE INDEX "store_delivery_incidents_affectedOrderItemId_idx" ON "store_delivery_incidents"("affectedOrderItemId");
