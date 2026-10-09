-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "municipalityId" TEXT,
ADD COLUMN     "zoneId" TEXT;

-- CreateIndex
CREATE INDEX "Store_countryId_idx" ON "Store"("countryId");

-- CreateIndex
CREATE INDEX "Store_departmentId_idx" ON "Store"("departmentId");

-- CreateIndex
CREATE INDEX "Store_municipalityId_idx" ON "Store"("municipalityId");

-- CreateIndex
CREATE INDEX "Store_zoneId_idx" ON "Store"("zoneId");
