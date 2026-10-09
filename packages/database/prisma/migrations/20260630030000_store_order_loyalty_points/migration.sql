-- Puntos de lealtad por compra online (acreditados al entregar)
ALTER TABLE "store_orders" ADD COLUMN "loyaltyPointsAwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_orders" ADD COLUMN "loyaltyPointsAwardedValue" INTEGER;
