CREATE TABLE "CustomerFavoriteSalon" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerFavoriteSalon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerFavoriteSalon_customerId_salonId_key" ON "CustomerFavoriteSalon"("customerId", "salonId");
CREATE INDEX "CustomerFavoriteSalon_customerId_idx" ON "CustomerFavoriteSalon"("customerId");
CREATE INDEX "CustomerFavoriteSalon_salonId_idx" ON "CustomerFavoriteSalon"("salonId");

ALTER TABLE "CustomerFavoriteSalon" ADD CONSTRAINT "CustomerFavoriteSalon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerFavoriteSalon" ADD CONSTRAINT "CustomerFavoriteSalon_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "branchId" TEXT;
CREATE INDEX "Booking_branchId_idx" ON "Booking"("branchId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
