DROP INDEX IF EXISTS "InternalUser_countryId_idx";
DROP INDEX IF EXISTS "InternalUser_departmentId_idx";
DROP INDEX IF EXISTS "InternalUser_municipalityId_idx";
DROP INDEX IF EXISTS "InternalUser_zoneId_idx";

ALTER TABLE "InternalUser"
  DROP COLUMN IF EXISTS "countryId",
  DROP COLUMN IF EXISTS "departmentId",
  DROP COLUMN IF EXISTS "municipalityId",
  DROP COLUMN IF EXISTS "zoneId";
