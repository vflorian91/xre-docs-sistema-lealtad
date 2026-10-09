CREATE TYPE "StoreLocationType" AS ENUM ('CAPITAL', 'DEPARTMENT');

ALTER TABLE "Store" ADD COLUMN "locationType" "StoreLocationType" NOT NULL DEFAULT 'CAPITAL';
ALTER TABLE "Store" ADD COLUMN "createdByInternalUserId" TEXT;
ALTER TABLE "Store" ADD COLUMN "updatedByInternalUserId" TEXT;
ALTER TABLE "Store" ADD COLUMN "deactivatedByInternalUserId" TEXT;
ALTER TABLE "Store" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "Store" ADD CONSTRAINT "Store_createdByInternalUserId_fkey" FOREIGN KEY ("createdByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_updatedByInternalUserId_fkey" FOREIGN KEY ("updatedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_deactivatedByInternalUserId_fkey" FOREIGN KEY ("deactivatedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Store_status_locationType_idx" ON "Store"("status", "locationType");
CREATE INDEX "Store_createdByInternalUserId_idx" ON "Store"("createdByInternalUserId");
CREATE INDEX "Store_updatedByInternalUserId_idx" ON "Store"("updatedByInternalUserId");
CREATE INDEX "Store_deactivatedByInternalUserId_idx" ON "Store"("deactivatedByInternalUserId");
