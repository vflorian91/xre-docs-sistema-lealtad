-- Purchase-count based loyalty level (replaces points-based level)

-- 1. New columns on Customer
ALTER TABLE "Customer" ADD COLUMN "purchasesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "loyaltyLevel" TEXT NOT NULL DEFAULT 'Básico';
CREATE INDEX "Customer_loyaltyLevel_idx" ON "Customer"("loyaltyLevel");

-- 2. Configurable level tiers table
CREATE TABLE "LoyaltyLevelTier" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minPurchases" INTEGER NOT NULL,
  "maxPurchases" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyLevelTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyLevelTier_code_key" ON "LoyaltyLevelTier"("code");
CREATE INDEX "LoyaltyLevelTier_sortOrder_idx" ON "LoyaltyLevelTier"("sortOrder");

INSERT INTO "LoyaltyLevelTier" ("id", "code", "name", "minPurchases", "maxPurchases", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('lvltier0001basico', 'BASICO', 'Básico', 0, 2, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lvltier0002bronce', 'BRONCE', 'Bronce', 3, 5, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lvltier0003plata', 'PLATA', 'Plata', 6, 10, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lvltier0004oro', 'ORO', 'Oro', 11, NULL, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Backfill purchasesCount from historical approved purchases
UPDATE "Customer" c
SET "purchasesCount" = COALESCE((
  SELECT COUNT(*) FROM "Purchase" p WHERE p."customerId" = c."id" AND p."status" = 'APPROVED'
), 0);

-- 4. Backfill loyaltyLevel from the seeded tiers
UPDATE "Customer" c
SET "loyaltyLevel" = t."name"
FROM "LoyaltyLevelTier" t
WHERE t."isActive" = true
  AND c."purchasesCount" >= t."minPurchases"
  AND (t."maxPurchases" IS NULL OR c."purchasesCount" <= t."maxPurchases");

-- 5. PointPromotion: single targetLevel -> multi targetLevels
ALTER TABLE "PointPromotion" ADD COLUMN "targetLevels" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "PointPromotion" SET "targetLevels" = ARRAY["targetLevel"] WHERE "targetLevel" IS NOT NULL;
ALTER TABLE "PointPromotion" DROP COLUMN "targetLevel";
