-- CreateTable
CREATE TABLE "store_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "websiteUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByInternalUserId" TEXT,
    "updatedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER,
    "mainImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleInStore" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByInternalUserId" TEXT,
    "updatedByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "comment" TEXT,
    "createdByInternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_product_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_brands_code_key" ON "store_brands"("code");

-- CreateIndex
CREATE INDEX "store_brands_isActive_displayOrder_idx" ON "store_brands"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_sku_key" ON "store_products"("sku");

-- CreateIndex
CREATE INDEX "store_products_brandId_idx" ON "store_products"("brandId");

-- CreateIndex
CREATE INDEX "store_products_isActive_isVisibleInStore_displayOrder_idx" ON "store_products"("isActive", "isVisibleInStore", "displayOrder");

-- CreateIndex
CREATE INDEX "store_product_images_productId_displayOrder_idx" ON "store_product_images"("productId", "displayOrder");

-- CreateIndex
CREATE INDEX "store_product_stock_movements_productId_createdAt_idx" ON "store_product_stock_movements"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "store_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_images" ADD CONSTRAINT "store_product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_stock_movements" ADD CONSTRAINT "store_product_stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
