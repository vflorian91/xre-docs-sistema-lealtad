CREATE TYPE "PointPromotionType" AS ENUM ('DOUBLE_POINTS', 'TRIPLE_POINTS', 'CUSTOM_MULTIPLIER', 'FIXED_BONUS', 'SPECIAL_AMOUNT', 'SHOE_TYPE_RULE');

CREATE TYPE "PointPromotionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ENDED');

ALTER TABLE "PointRule" ADD COLUMN "pointValueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.01;
ALTER TABLE "PointRule" ADD COLUMN "pointsExpirationDays" INTEGER;
ALTER TABLE "PointRule" ADD COLUMN "createdByInternalUserId" TEXT;

CREATE TABLE "PointPromotion" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PointPromotionType" NOT NULL,
  "multiplier" DECIMAL(6,2),
  "bonusPoints" INTEGER,
  "minimumAmount" DECIMAL(12,2),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "PointPromotionStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetLevel" TEXT,
  "storeId" TEXT,
  "zoneId" TEXT,
  "departmentId" TEXT,
  "municipalityId" TEXT,
  "shoeTypeId" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "usedAt" TIMESTAMP(3),
  "createdByInternalUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PointPromotion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PointMovement" ADD COLUMN "pointRuleId" TEXT;
ALTER TABLE "PointMovement" ADD COLUMN "pointPromotionId" TEXT;
ALTER TABLE "PointMovement" ADD COLUMN "basePointsCalculated" INTEGER;
ALTER TABLE "PointMovement" ADD COLUMN "pointsBeforePromotion" INTEGER;
ALTER TABLE "PointMovement" ADD COLUMN "pointRuleSnapshot" JSONB;
ALTER TABLE "PointMovement" ADD COLUMN "pointPromotionSnapshot" JSONB;

CREATE INDEX "PointRule_isActive_startsAt_endsAt_idx" ON "PointRule"("isActive", "startsAt", "endsAt");
CREATE INDEX "PointPromotion_status_startsAt_endsAt_idx" ON "PointPromotion"("status", "startsAt", "endsAt");
CREATE INDEX "PointPromotion_storeId_startsAt_endsAt_idx" ON "PointPromotion"("storeId", "startsAt", "endsAt");
CREATE INDEX "PointPromotion_shoeTypeId_startsAt_endsAt_idx" ON "PointPromotion"("shoeTypeId", "startsAt", "endsAt");
CREATE INDEX "PointMovement_pointRuleId_idx" ON "PointMovement"("pointRuleId");
CREATE INDEX "PointMovement_pointPromotionId_idx" ON "PointMovement"("pointPromotionId");

ALTER TABLE "PointPromotion" ADD CONSTRAINT "PointPromotion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PointMovement" ADD CONSTRAINT "PointMovement_pointRuleId_fkey" FOREIGN KEY ("pointRuleId") REFERENCES "PointRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PointMovement" ADD CONSTRAINT "PointMovement_pointPromotionId_fkey" FOREIGN KEY ("pointPromotionId") REFERENCES "PointPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
