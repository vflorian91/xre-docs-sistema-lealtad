ALTER TABLE "MarketingBanner"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "totalViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalClicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastViewAt" TIMESTAMP(3),
ADD COLUMN "lastClickAt" TIMESTAMP(3);

UPDATE "MarketingBanner"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END;

CREATE TABLE "MarketingBannerEvent" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingBannerEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MarketingBannerEvent"
ADD CONSTRAINT "MarketingBannerEvent_bannerId_fkey"
FOREIGN KEY ("bannerId") REFERENCES "MarketingBanner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketingBannerEvent"
ADD CONSTRAINT "MarketingBannerEvent_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MarketingBanner_status_startsAt_endsAt_sortOrder_idx" ON "MarketingBanner"("status", "startsAt", "endsAt", "sortOrder");
CREATE INDEX "MarketingBanner_sortOrder_idx" ON "MarketingBanner"("sortOrder");
CREATE INDEX "MarketingBannerEvent_bannerId_eventType_createdAt_idx" ON "MarketingBannerEvent"("bannerId", "eventType", "createdAt");
CREATE INDEX "MarketingBannerEvent_customerId_createdAt_idx" ON "MarketingBannerEvent"("customerId", "createdAt");
