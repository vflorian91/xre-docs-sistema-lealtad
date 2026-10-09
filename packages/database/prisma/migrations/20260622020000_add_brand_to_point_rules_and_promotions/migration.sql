-- Segmentacion de reglas de puntos y promociones por marca
ALTER TABLE "PointRule" ADD COLUMN "brandItemId" TEXT;
CREATE INDEX "PointRule_brandItemId_idx" ON "PointRule"("brandItemId");
ALTER TABLE "PointRule" ADD CONSTRAINT "PointRule_brandItemId_fkey" FOREIGN KEY ("brandItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PointPromotion" ADD COLUMN "brandItemId" TEXT;
CREATE INDEX "PointPromotion_brandItemId_startsAt_endsAt_idx" ON "PointPromotion"("brandItemId", "startsAt", "endsAt");
ALTER TABLE "PointPromotion" ADD CONSTRAINT "PointPromotion_brandItemId_fkey" FOREIGN KEY ("brandItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
