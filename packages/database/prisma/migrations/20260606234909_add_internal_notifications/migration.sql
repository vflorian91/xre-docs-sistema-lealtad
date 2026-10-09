-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('GLOBAL_CUSTOMERS', 'GLOBAL_INTERNAL', 'CUSTOMER', 'INTERNAL_USER', 'ROLE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('INTERNAL', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationRecipientStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'INTERNAL',
    "audience" "NotificationAudience" NOT NULL,
    "customerId" TEXT,
    "internalUserId" TEXT,
    "roleId" TEXT,
    "createdByInternalUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "customerId" TEXT,
    "internalUserId" TEXT,
    "status" "NotificationRecipientStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_audience_isActive_startsAt_expiresAt_idx" ON "Notification"("audience", "isActive", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_customerId_createdAt_idx" ON "Notification"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_internalUserId_createdAt_idx" ON "Notification"("internalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_roleId_createdAt_idx" ON "Notification"("roleId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_customerId_status_createdAt_idx" ON "NotificationRecipient"("customerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_internalUserId_status_createdAt_idx" ON "NotificationRecipient"("internalUserId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_customerId_key" ON "NotificationRecipient"("notificationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_internalUserId_key" ON "NotificationRecipient"("notificationId", "internalUserId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_internalUserId_fkey" FOREIGN KEY ("internalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdByInternalUserId_fkey" FOREIGN KEY ("createdByInternalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_internalUserId_fkey" FOREIGN KEY ("internalUserId") REFERENCES "InternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
