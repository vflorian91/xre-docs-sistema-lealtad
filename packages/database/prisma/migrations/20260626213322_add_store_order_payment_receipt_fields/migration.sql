-- AlterTable
ALTER TABLE "store_order_payments" ADD COLUMN     "receiptFileName" TEXT,
ADD COLUMN     "receiptFileUrl" TEXT,
ADD COLUMN     "receiptUploadedAt" TIMESTAMP(3),
ADD COLUMN     "receiptUploadedByInternalUserId" TEXT;
