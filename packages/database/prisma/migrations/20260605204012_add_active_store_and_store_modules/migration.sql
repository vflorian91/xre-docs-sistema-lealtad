-- AlterTable
ALTER TABLE "InternalSession" ADD COLUMN     "activeStoreId" TEXT;

-- CreateIndex
CREATE INDEX "InternalSession_activeStoreId_idx" ON "InternalSession"("activeStoreId");

-- AddForeignKey
ALTER TABLE "InternalSession" ADD CONSTRAINT "InternalSession_activeStoreId_fkey" FOREIGN KEY ("activeStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
