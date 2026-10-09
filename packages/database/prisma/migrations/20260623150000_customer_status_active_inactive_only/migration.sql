UPDATE "Customer"
SET "status" = 'INACTIVE'
WHERE "status" = 'BLOCKED';

ALTER TABLE "Customer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "CustomerStatus" RENAME TO "CustomerStatus_old";
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "Customer"
ALTER COLUMN "status" TYPE "CustomerStatus"
USING "status"::text::"CustomerStatus";

ALTER TABLE "Customer" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "CustomerStatus_old";
