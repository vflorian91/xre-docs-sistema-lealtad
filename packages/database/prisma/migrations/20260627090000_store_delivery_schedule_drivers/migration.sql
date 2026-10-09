-- Store delivery schedule and operational messenger assignment.
CREATE TABLE "store_drivers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INTERNO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdByInternalUserId" TEXT,
    "updatedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_drivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_delivery_assignment_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "previousDriverId" TEXT,
    "newDriverId" TEXT,
    "reasonCode" TEXT,
    "comment" TEXT,
    "createdByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_delivery_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_drivers_code_key" ON "store_drivers"("code");
CREATE INDEX "store_drivers_isActive_idx" ON "store_drivers"("isActive");
CREATE INDEX "store_orders_deliveryStatus_idx" ON "store_orders"("deliveryStatus");
CREATE INDEX "store_orders_confirmedDeliveryDate_idx" ON "store_orders"("confirmedDeliveryDate");
CREATE INDEX "store_orders_assignedDriverId_idx" ON "store_orders"("assignedDriverId");
CREATE INDEX "store_delivery_assignment_history_orderId_createdAt_idx" ON "store_delivery_assignment_history"("orderId", "createdAt");
CREATE INDEX "store_delivery_assignment_history_newDriverId_idx" ON "store_delivery_assignment_history"("newDriverId");

ALTER TABLE "store_orders"
  ADD CONSTRAINT "store_orders_assignedDriverId_fkey"
  FOREIGN KEY ("assignedDriverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_delivery_assignment_history"
  ADD CONSTRAINT "store_delivery_assignment_history_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_delivery_assignment_history"
  ADD CONSTRAINT "store_delivery_assignment_history_previousDriverId_fkey"
  FOREIGN KEY ("previousDriverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_delivery_assignment_history"
  ADD CONSTRAINT "store_delivery_assignment_history_newDriverId_fkey"
  FOREIGN KEY ("newDriverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
