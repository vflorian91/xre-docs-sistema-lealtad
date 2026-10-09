ALTER TABLE "InternalUser"
  ADD COLUMN "countryId" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "municipalityId" TEXT,
  ADD COLUMN "zoneId" TEXT;

CREATE INDEX "InternalUser_countryId_idx" ON "InternalUser"("countryId");
CREATE INDEX "InternalUser_departmentId_idx" ON "InternalUser"("departmentId");
CREATE INDEX "InternalUser_municipalityId_idx" ON "InternalUser"("municipalityId");
CREATE INDEX "InternalUser_zoneId_idx" ON "InternalUser"("zoneId");
