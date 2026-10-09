-- Vehículo asignado al motorista
ALTER TABLE "store_drivers" ADD COLUMN "vehiclePlate" TEXT;
ALTER TABLE "store_drivers" ADD COLUMN "vehicleType" TEXT;
ALTER TABLE "store_drivers" ADD COLUMN "vehicleBrand" TEXT;
ALTER TABLE "store_drivers" ADD COLUMN "vehicleModel" TEXT;
-- Canal de notificaciones para el motorista
ALTER TYPE "NotificationAudience" ADD VALUE IF NOT EXISTS 'DRIVER';
ALTER TABLE "Notification" ADD COLUMN "driverId" TEXT;
ALTER TABLE "NotificationRecipient" ADD COLUMN "driverId" TEXT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_driverId_key" ON "NotificationRecipient"("notificationId", "driverId");
CREATE INDEX "NotificationRecipient_driverId_status_createdAt_idx" ON "NotificationRecipient"("driverId", "status", "createdAt");
