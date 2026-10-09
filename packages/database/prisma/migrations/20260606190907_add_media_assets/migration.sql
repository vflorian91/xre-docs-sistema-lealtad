-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "profilePhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "uploadedByInternalUserId" TEXT,
    "uploadedByCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_purpose_createdAt_idx" ON "MediaAsset"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedByInternalUserId_createdAt_idx" ON "MediaAsset"("uploadedByInternalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedByCustomerId_createdAt_idx" ON "MediaAsset"("uploadedByCustomerId", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByInternalUserId_fkey" FOREIGN KEY ("uploadedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByCustomerId_fkey" FOREIGN KEY ("uploadedByCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
