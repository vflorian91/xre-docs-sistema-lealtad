ALTER TABLE "Customer" ADD COLUMN "brandItemId" TEXT;

UPDATE "Customer" AS customer
SET "brandItemId" = brand_item.id
FROM "CatalogItem" AS brand_item
JOIN "Catalog" AS catalog ON catalog.id = brand_item."catalogId"
WHERE catalog.code = 'BRANDS'
  AND customer.brand IS NOT NULL
  AND LOWER(TRIM(customer.brand)) = LOWER(TRIM(brand_item.name));

CREATE INDEX "Customer_brandItemId_idx" ON "Customer"("brandItemId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_brandItemId_fkey"
FOREIGN KEY ("brandItemId") REFERENCES "CatalogItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
