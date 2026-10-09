-- Add the internal user geography fields already defined in schema.prisma.
ALTER TABLE "InternalUser"
ADD COLUMN "departamentoItemId" TEXT,
ADD COLUMN "municipioItemId" TEXT,
ADD COLUMN "paisItemId" TEXT,
ADD COLUMN "zonaItemId" TEXT;

ALTER TABLE "InternalUser" ADD CONSTRAINT "InternalUser_paisItemId_fkey"
FOREIGN KEY ("paisItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalUser" ADD CONSTRAINT "InternalUser_departamentoItemId_fkey"
FOREIGN KEY ("departamentoItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalUser" ADD CONSTRAINT "InternalUser_municipioItemId_fkey"
FOREIGN KEY ("municipioItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalUser" ADD CONSTRAINT "InternalUser_zonaItemId_fkey"
FOREIGN KEY ("zonaItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
