-- Agrega trazabilidad operativa completa para el expediente de solicitudes de canje.
ALTER TABLE "redemption_requests"
  ADD COLUMN "reviewStartedAt" TIMESTAMP(3),
  ADD COLUMN "sentToStoreAt" TIMESTAMP(3),
  ADD COLUMN "approvedByInternalUserId" TEXT,
  ADD COLUMN "sentToStoreByInternalUserId" TEXT,
  ADD COLUMN "preparedByInternalUserId" TEXT,
  ADD COLUMN "deliveredByInternalUserId" TEXT,
  ADD COLUMN "rejectedByInternalUserId" TEXT,
  ADD COLUMN "cancelledByInternalUserId" TEXT,
  ADD COLUMN "approvalComment" TEXT,
  ADD COLUMN "sentToStoreComment" TEXT,
  ADD COLUMN "preparationComment" TEXT,
  ADD COLUMN "deliveryObservation" TEXT,
  ADD COLUMN "deliveredToName" TEXT,
  ADD COLUMN "validationCode" TEXT,
  ADD COLUMN "validationQrPayload" JSONB,
  ADD COLUMN "deliveryEvidenceUrl" TEXT,
  ADD COLUMN "operationalValidations" JSONB;

UPDATE "redemption_requests"
SET
  "validationCode" = "requestCode",
  "validationQrPayload" = jsonb_build_object(
    'type', 'LOYALTY_REDEMPTION',
    'requestCode', "requestCode",
    'redemptionRequestId', "id"
  )
WHERE "validationCode" IS NULL;

UPDATE "redemption_requests"
SET
  "approvedByInternalUserId" = "managedByInternalUserId",
  "sentToStoreByInternalUserId" = "managedByInternalUserId",
  "preparedByInternalUserId" = "managedByInternalUserId",
  "deliveredByInternalUserId" = "managedByInternalUserId",
  "rejectedByInternalUserId" = "managedByInternalUserId",
  "cancelledByInternalUserId" = "managedByInternalUserId"
WHERE "managedByInternalUserId" IS NOT NULL;

CREATE INDEX "redemption_requests_validationCode_idx" ON "redemption_requests"("validationCode");
CREATE INDEX "redemption_requests_approvedByInternalUserId_idx" ON "redemption_requests"("approvedByInternalUserId");
CREATE INDEX "redemption_requests_sentToStoreByInternalUserId_idx" ON "redemption_requests"("sentToStoreByInternalUserId");
CREATE INDEX "redemption_requests_preparedByInternalUserId_idx" ON "redemption_requests"("preparedByInternalUserId");
CREATE INDEX "redemption_requests_deliveredByInternalUserId_idx" ON "redemption_requests"("deliveredByInternalUserId");

ALTER TABLE "redemption_requests"
  ADD CONSTRAINT "redemption_requests_approvedByInternalUserId_fkey"
    FOREIGN KEY ("approvedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "redemption_requests_sentToStoreByInternalUserId_fkey"
    FOREIGN KEY ("sentToStoreByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "redemption_requests_preparedByInternalUserId_fkey"
    FOREIGN KEY ("preparedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "redemption_requests_deliveredByInternalUserId_fkey"
    FOREIGN KEY ("deliveredByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "redemption_requests_rejectedByInternalUserId_fkey"
    FOREIGN KEY ("rejectedByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "redemption_requests_cancelledByInternalUserId_fkey"
    FOREIGN KEY ("cancelledByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
