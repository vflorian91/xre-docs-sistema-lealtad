-- Recolección por producto + tienda origen (aditivo, compatible con pedidos existentes).
ALTER TABLE "store_order_items" ADD COLUMN "originStoreId" TEXT;
ALTER TABLE "store_order_items" ADD COLUMN "originStoreSnapshot" JSONB;
ALTER TABLE "store_order_items" ADD COLUMN "pickupStatus" TEXT NOT NULL DEFAULT 'PENDIENTE_ASIGNAR_TIENDA';
ALTER TABLE "store_order_items" ADD COLUMN "pickedUpAt" TIMESTAMP(3);
ALTER TABLE "store_order_items" ADD COLUMN "pickedUpByDriverId" TEXT;
ALTER TABLE "store_order_items" ADD COLUMN "pickupNote" TEXT;
ALTER TABLE "store_order_items" ADD COLUMN "pickupEvidenceUrl" TEXT;

CREATE INDEX "store_order_items_originStoreId_idx" ON "store_order_items"("originStoreId");
CREATE INDEX "store_order_items_pickupStatus_idx" ON "store_order_items"("pickupStatus");

ALTER TABLE "store_order_items"
  ADD CONSTRAINT "store_order_items_originStoreId_fkey"
  FOREIGN KEY ("originStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_order_items"
  ADD CONSTRAINT "store_order_items_pickedUpByDriverId_fkey"
  FOREIGN KEY ("pickedUpByDriverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: los items de pedidos ya entregados se marcan como recolectados (coherencia historica).
UPDATE "store_order_items" i
SET "pickupStatus" = 'RECOLECTADO'
FROM "store_orders" o
WHERE i."orderId" = o."id" AND o."orderStatus" = 'ENTREGADO';
