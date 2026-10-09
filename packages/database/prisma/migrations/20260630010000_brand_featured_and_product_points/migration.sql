-- Marca destacada (máx 5 en inicio del cliente)
ALTER TABLE "store_brands" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
-- Producto: parametrizar si genera puntos de lealtad (solo tienda online)
ALTER TABLE "store_products" ADD COLUMN "generatesLoyaltyPoints" BOOLEAN NOT NULL DEFAULT true;
