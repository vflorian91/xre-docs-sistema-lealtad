-- Segmentacion de premios canjeables por marca del cliente
ALTER TABLE "redeemable_products" ADD COLUMN "brandItemId" TEXT;

CREATE INDEX "redeemable_products_brandItemId_idx" ON "redeemable_products"("brandItemId");

ALTER TABLE "redeemable_products" ADD CONSTRAINT "redeemable_products_brandItemId_fkey" FOREIGN KEY ("brandItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
