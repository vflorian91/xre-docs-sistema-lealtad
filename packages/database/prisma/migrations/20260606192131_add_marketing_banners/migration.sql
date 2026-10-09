-- CreateTable
CREATE TABLE "MarketingBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "badge" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'blue',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingBanner_isActive_startsAt_endsAt_sortOrder_idx" ON "MarketingBanner"("isActive", "startsAt", "endsAt", "sortOrder");
