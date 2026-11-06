CREATE TYPE "AdvertisementTargetingMode" AS ENUM ('ALL', 'PINCODE');
CREATE TYPE "AdvertisementDurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

ALTER TABLE "Advertisement"
  ADD COLUMN "targetingMode" "AdvertisementTargetingMode" NOT NULL DEFAULT 'ALL',
  ADD COLUMN "durationValue" INTEGER,
  ADD COLUMN "durationUnit" "AdvertisementDurationUnit";

CREATE TABLE "AdvertisementPincode" (
  "id" TEXT NOT NULL,
  "advertisementId" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdvertisementPincode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdvertisementPincode_advertisementId_pincode_key"
  ON "AdvertisementPincode"("advertisementId", "pincode");
CREATE INDEX "AdvertisementPincode_pincode_advertisementId_idx"
  ON "AdvertisementPincode"("pincode", "advertisementId");

ALTER TABLE "AdvertisementPincode"
  ADD CONSTRAINT "AdvertisementPincode_advertisementId_fkey"
  FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
