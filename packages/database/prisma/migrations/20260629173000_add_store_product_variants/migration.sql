-- Store product variants for generic ecommerce catalogs.

CREATE TABLE "store_product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT,
    "optionValues" JSONB NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "promotionalPrice" DECIMAL(12,2),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByInternalUserId" TEXT,
    "updatedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_product_variants_sku_key" ON "store_product_variants"("sku");
CREATE INDEX "store_product_variants_productId_isActive_displayOrder_idx" ON "store_product_variants"("productId", "isActive", "displayOrder");

ALTER TABLE "store_product_variants"
ADD CONSTRAINT "store_product_variants_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_product_stock_movements" ADD COLUMN "variantId" TEXT;
CREATE INDEX "store_product_stock_movements_variantId_createdAt_idx" ON "store_product_stock_movements"("variantId", "createdAt");
ALTER TABLE "store_product_stock_movements"
ADD CONSTRAINT "store_product_stock_movements_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "store_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "store_product_stock_movements_product_reference_key";

ALTER TABLE "store_cart_items" ADD COLUMN "variantId" TEXT;
CREATE INDEX "store_cart_items_variantId_idx" ON "store_cart_items"("variantId");
ALTER TABLE "store_cart_items"
ADD CONSTRAINT "store_cart_items_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "store_product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "store_cart_items_cartId_productId_key";
CREATE UNIQUE INDEX "store_cart_items_cart_product_no_variant_key"
ON "store_cart_items"("cartId", "productId")
WHERE "variantId" IS NULL;
CREATE UNIQUE INDEX "store_cart_items_cart_variant_key"
ON "store_cart_items"("cartId", "variantId")
WHERE "variantId" IS NOT NULL;

ALTER TABLE "store_order_items" ADD COLUMN "variantId" TEXT;
ALTER TABLE "store_order_items" ADD COLUMN "variantLabelSnapshot" TEXT;
ALTER TABLE "store_order_items" ADD COLUMN "variantOptionsSnapshot" JSONB;
ALTER TABLE "store_order_items" ADD COLUMN "skuSnapshot" TEXT;
CREATE INDEX "store_order_items_variantId_idx" ON "store_order_items"("variantId");
ALTER TABLE "store_order_items"
ADD CONSTRAINT "store_order_items_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "store_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "store_order_items" oi
SET "skuSnapshot" = p."sku"
FROM "store_products" p
WHERE oi."productId" = p."id" AND oi."skuSnapshot" IS NULL;
