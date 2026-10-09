-- Add immutable loyalty level rules and attach existing tiers to a default global rule.

CREATE TABLE "LoyaltyLevelRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brandItemId" TEXT,
  "brandNameSnapshot" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByInternalUserId" TEXT,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyLevelRule_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoyaltyLevelRule" ("id", "name", "brandNameSnapshot", "isActive", "activatedAt", "createdAt", "updatedAt")
VALUES ('lvlrule0001global', 'Regla global de niveles', 'Todas las marcas', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "LoyaltyLevelTier" ADD COLUMN "ruleId" TEXT;
UPDATE "LoyaltyLevelTier" SET "ruleId" = 'lvlrule0001global' WHERE "ruleId" IS NULL;
ALTER TABLE "LoyaltyLevelTier" ALTER COLUMN "ruleId" SET NOT NULL;

DROP INDEX IF EXISTS "LoyaltyLevelTier_code_key";
DROP INDEX IF EXISTS "LoyaltyLevelTier_sortOrder_idx";

CREATE UNIQUE INDEX "LoyaltyLevelTier_ruleId_code_key" ON "LoyaltyLevelTier"("ruleId", "code");
CREATE INDEX "LoyaltyLevelTier_ruleId_sortOrder_idx" ON "LoyaltyLevelTier"("ruleId", "sortOrder");
CREATE INDEX "LoyaltyLevelTier_sortOrder_idx" ON "LoyaltyLevelTier"("sortOrder");
CREATE INDEX "LoyaltyLevelRule_brandItemId_isActive_idx" ON "LoyaltyLevelRule"("brandItemId", "isActive");
CREATE INDEX "LoyaltyLevelRule_createdAt_idx" ON "LoyaltyLevelRule"("createdAt");

ALTER TABLE "LoyaltyLevelRule"
  ADD CONSTRAINT "LoyaltyLevelRule_brandItemId_fkey"
  FOREIGN KEY ("brandItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLevelRule"
  ADD CONSTRAINT "LoyaltyLevelRule_createdByInternalUserId_fkey"
  FOREIGN KEY ("createdByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLevelTier"
  ADD CONSTRAINT "LoyaltyLevelTier_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "LoyaltyLevelRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
