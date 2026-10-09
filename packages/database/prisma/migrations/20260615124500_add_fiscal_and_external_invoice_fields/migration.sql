ALTER TABLE "Customer" ADD COLUMN "taxId" TEXT;

ALTER TABLE "Purchase" ADD COLUMN "externalSource" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "externalInvoiceId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "externalPayload" JSONB;
ALTER TABLE "Purchase" ADD COLUMN "externalSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Customer_taxId_key" ON "Customer"("taxId");
CREATE UNIQUE INDEX "Purchase_externalSource_externalInvoiceId_key" ON "Purchase"("externalSource", "externalInvoiceId");
CREATE INDEX "Purchase_externalSource_externalSyncedAt_idx" ON "Purchase"("externalSource", "externalSyncedAt");
