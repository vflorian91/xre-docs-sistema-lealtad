ALTER TABLE "MarketingBanner" ADD COLUMN "audienceType" TEXT NOT NULL DEFAULT 'ALL';

CREATE TABLE "MarketingBannerTargetBrand" (
  "bannerId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  CONSTRAINT "MarketingBannerTargetBrand_pkey" PRIMARY KEY ("bannerId", "brandId"),
  CONSTRAINT "MarketingBannerTargetBrand_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "MarketingBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MarketingBannerTargetBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MarketingBannerTargetBrand_brandId_idx" ON "MarketingBannerTargetBrand"("brandId");
CREATE INDEX "MarketingBanner_audienceType_idx" ON "MarketingBanner"("audienceType");
