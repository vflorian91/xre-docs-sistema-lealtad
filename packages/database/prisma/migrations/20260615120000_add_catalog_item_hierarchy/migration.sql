ALTER TABLE "CatalogItem" ADD COLUMN "parentItemId" TEXT;

ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CatalogItem_parentItemId_idx" ON "CatalogItem"("parentItemId");
