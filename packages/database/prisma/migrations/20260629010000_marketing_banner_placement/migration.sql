ALTER TABLE "MarketingBanner" ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'LOYALTY';

CREATE INDEX "MarketingBanner_placement_status_startsAt_endsAt_sortOrder_idx"
ON "MarketingBanner"("placement", "status", "startsAt", "endsAt", "sortOrder");
