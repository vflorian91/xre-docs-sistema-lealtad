-- FRD 08 · Slice B — Incidencias de entrega del motorista
CREATE TABLE "store_delivery_incidents" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "driverId" TEXT,
  "incidentType" TEXT NOT NULL,
  "comment" TEXT,
  "evidencePhotoUrl" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "addressText" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION',
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByInternalUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "adminResolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_delivery_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "store_delivery_incidents_orderId_idx" ON "store_delivery_incidents"("orderId");
CREATE INDEX "store_delivery_incidents_status_idx" ON "store_delivery_incidents"("status");
ALTER TABLE "store_delivery_incidents" ADD CONSTRAINT "store_delivery_incidents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_delivery_incidents" ADD CONSTRAINT "store_delivery_incidents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
