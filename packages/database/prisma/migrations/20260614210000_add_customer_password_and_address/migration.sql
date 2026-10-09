ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Customer" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN "zone" TEXT;
ALTER TABLE "Customer" ADD COLUMN "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN "department" TEXT;
ALTER TABLE "Customer" ADD COLUMN "country" TEXT;
ALTER TABLE "Customer" ADD COLUMN "reference" TEXT;
