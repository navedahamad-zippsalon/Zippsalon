/*
  Warnings:

  - Added the required column `countryCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryCode" TEXT NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateTable
CREATE TABLE "SalonContact" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isWhatsapp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalonContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonContact_salonId_idx" ON "SalonContact"("salonId");

-- AddForeignKey
ALTER TABLE "SalonContact" ADD CONSTRAINT "SalonContact_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
