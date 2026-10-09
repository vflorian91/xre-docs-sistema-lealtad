ALTER TABLE "customer_addresses" ADD COLUMN "addressType" TEXT NOT NULL DEFAULT 'CASA';
ALTER TABLE "customer_addresses" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN "recipientName" TEXT;
