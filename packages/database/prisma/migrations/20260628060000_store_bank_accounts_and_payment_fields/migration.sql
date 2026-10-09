-- Catálogo de cuentas bancarias de la empresa + campos aditivos de pago reportado por cliente.
CREATE TABLE "store_bank_accounts" (
  "id" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountHolder" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_bank_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "store_bank_accounts_isActive_idx" ON "store_bank_accounts"("isActive");

ALTER TABLE "store_order_payments" ADD COLUMN "selectedBankAccountId" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "bankNameSnapshot" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "accountHolderSnapshot" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "accountNumberSnapshot" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "accountTypeSnapshot" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "cashAvailableAmount" DECIMAL(12,2);
ALTER TABLE "store_order_payments" ADD COLUMN "visaLinkRequestedAt" TIMESTAMP(3);
ALTER TABLE "store_order_payments" ADD COLUMN "reportedByCustomerAt" TIMESTAMP(3);
ALTER TABLE "store_order_payments" ADD COLUMN "reviewedByInternalUserId" TEXT;
ALTER TABLE "store_order_payments" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "store_order_payments" ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "store_order_payments"
  ADD CONSTRAINT "store_order_payments_selectedBankAccountId_fkey"
  FOREIGN KEY ("selectedBankAccountId") REFERENCES "store_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
