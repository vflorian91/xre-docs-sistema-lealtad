ALTER TABLE "redeemable_products"
ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isGiftCard" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "redemption_requests"
ADD COLUMN "productImageUrlSnapshot" TEXT,
ADD COLUMN "productDescriptionSnapshot" TEXT,
ADD COLUMN "productIsGiftCardSnapshot" BOOLEAN NOT NULL DEFAULT false;
