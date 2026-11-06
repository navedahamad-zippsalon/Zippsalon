ALTER TYPE "AdvertisementStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "AdvertisementStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE TYPE "AdvertisementMediaType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT');
CREATE TYPE "AdvertisementTargetAudience" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');
CREATE TYPE "AdvertisementActionType" AS ENUM ('URL', 'DEEP_LINK', 'SERVICE', 'SALON', 'BOOKING', 'NONE');

ALTER TABLE "Advertisement"
  ALTER COLUMN "startAt" DROP NOT NULL,
  ALTER COLUMN "endAt" DROP NOT NULL,
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "mediaType" "AdvertisementMediaType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "mediaUrl" TEXT,
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "actionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "actionButtonName" TEXT,
  ADD COLUMN "actionType" "AdvertisementActionType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "actionUrl" TEXT,
  ADD COLUMN "targetAudience" "AdvertisementTargetAudience" NOT NULL DEFAULT 'BOTH',
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Advertisement_targetAudience_status_startAt_endAt_deletedAt_idx"
  ON "Advertisement"("targetAudience", "status", "startAt", "endAt", "deletedAt");