ALTER TABLE "CatalogItem" ADD COLUMN "description" TEXT;

ALTER TABLE "CatalogItem" ADD COLUMN "allowsSubcatalog" BOOLEAN NOT NULL DEFAULT false;
