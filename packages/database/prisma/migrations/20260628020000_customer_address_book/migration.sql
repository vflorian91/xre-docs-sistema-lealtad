-- Libreta de direcciones del cliente (aditivo, compatible con pedidos existentes).
CREATE TABLE "customer_addresses" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "municipality" TEXT NOT NULL,
  "zone" TEXT,
  "addressLine" TEXT NOT NULL,
  "reference" TEXT,
  "contactPhone" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_customerId_isActive_idx" ON "customer_addresses"("customerId", "isActive");

ALTER TABLE "customer_addresses"
  ADD CONSTRAINT "customer_addresses_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Referencia opcional + snapshot en el pedido (mantiene deliveryAddress string por compatibilidad).
ALTER TABLE "store_orders" ADD COLUMN "customerAddressId" TEXT;
ALTER TABLE "store_orders" ADD COLUMN "deliveryAddressSnapshot" JSONB;

ALTER TABLE "store_orders"
  ADD CONSTRAINT "store_orders_customerAddressId_fkey"
  FOREIGN KEY ("customerAddressId") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
