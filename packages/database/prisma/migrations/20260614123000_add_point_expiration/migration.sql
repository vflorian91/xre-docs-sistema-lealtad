ALTER TABLE "PointMovement" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "PointMovement_status_expiresAt_idx" ON "PointMovement"("status", "expiresAt");
