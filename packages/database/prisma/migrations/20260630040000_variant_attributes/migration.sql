-- Variante = mismo producto cambiando talla, color, género, tipo e imagen
ALTER TABLE "store_product_variants" ADD COLUMN "size" TEXT;
ALTER TABLE "store_product_variants" ADD COLUMN "color" TEXT;
ALTER TABLE "store_product_variants" ADD COLUMN "genderTarget" TEXT;
ALTER TABLE "store_product_variants" ADD COLUMN "productType" TEXT;
ALTER TABLE "store_product_variants" ADD COLUMN "imageUrl" TEXT;
