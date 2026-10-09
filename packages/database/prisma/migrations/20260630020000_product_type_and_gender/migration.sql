-- Tipo y género para filtros (tienda online + canjeables)
ALTER TABLE "store_products" ADD COLUMN "productType" TEXT;
ALTER TABLE "store_products" ADD COLUMN "genderTarget" TEXT;
ALTER TABLE "redeemable_products" ADD COLUMN "productType" TEXT;
ALTER TABLE "redeemable_products" ADD COLUMN "genderTarget" TEXT;
