-- Feed-only forward migration. Existing inventory migrations are intentionally not replayed.
ALTER TYPE "FeedPostStatus" ADD VALUE IF NOT EXISTS 'DELETED';
ALTER TYPE "FeedPostStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "FeedVisibility" AS ENUM ('PUBLIC', 'SALON', 'BRANCH', 'PRIVATE');
ALTER TABLE "FeedPost" ADD COLUMN "visibility" "FeedVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "FeedPost" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "FeedPost" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "FeedPost" ADD COLUMN "createdBy" TEXT;
UPDATE "FeedPost" SET "createdBy" = "vendorId" WHERE "createdBy" IS NULL;
ALTER TABLE "FeedPost" ALTER COLUMN "createdBy" SET NOT NULL;

ALTER TABLE "FeedStory" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "FeedStory" ADD COLUMN "createdBy" TEXT;
UPDATE "FeedStory" SET "publishedAt" = "createdAt", "createdBy" = "vendorId" WHERE "publishedAt" IS NULL OR "createdBy" IS NULL;
ALTER TABLE "FeedStory" ALTER COLUMN "publishedAt" SET NOT NULL;
ALTER TABLE "FeedStory" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TYPE "FeedStoryStatus" RENAME TO "FeedStoryStatus_old";
CREATE TYPE "FeedStoryStatus" AS ENUM ('PUBLISHED', 'ARCHIVED', 'DELETED', 'REJECTED');
ALTER TABLE "FeedStory" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FeedStory" ALTER COLUMN "status" TYPE "FeedStoryStatus" USING (CASE "status"::text WHEN 'ACTIVE' THEN 'PUBLISHED' ELSE 'ARCHIVED' END::"FeedStoryStatus");
ALTER TABLE "FeedStory" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
DROP TYPE "FeedStoryStatus_old";

ALTER TABLE "FeedMedia" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "FeedMedia" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "FeedCommentStatus" AS ENUM ('ACTIVE', 'DELETED', 'REJECTED');
ALTER TABLE "FeedComment" ADD COLUMN "status" "FeedCommentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "FeedComment" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TYPE "FeedShareChannel" RENAME TO "FeedSharePlatform_old";
CREATE TYPE "FeedSharePlatform" AS ENUM ('NATIVE', 'COPY_LINK', 'WHATSAPP', 'FACEBOOK', 'X', 'LINKEDIN', 'INSTAGRAM', 'OTHER');
ALTER TABLE "FeedShare" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "FeedShare" ALTER COLUMN "channel" TYPE "FeedSharePlatform" USING (CASE "channel"::text WHEN 'DIRECT_MESSAGE' THEN 'OTHER' ELSE "channel"::text END::"FeedSharePlatform");
ALTER TABLE "FeedShare" ALTER COLUMN "channel" SET DEFAULT 'COPY_LINK';
DROP TYPE "FeedSharePlatform_old";

CREATE TYPE "FeedReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'HARASSMENT', 'OTHER');
ALTER TABLE "FeedReport" ADD COLUMN "reason_new" "FeedReportReason";
UPDATE "FeedReport" SET "reason_new" = CASE UPPER("reason") WHEN 'SPAM' THEN 'SPAM'::"FeedReportReason" WHEN 'INAPPROPRIATE' THEN 'INAPPROPRIATE'::"FeedReportReason" WHEN 'COPYRIGHT' THEN 'COPYRIGHT'::"FeedReportReason" WHEN 'HARASSMENT' THEN 'HARASSMENT'::"FeedReportReason" ELSE 'OTHER'::"FeedReportReason" END;
ALTER TABLE "FeedReport" DROP COLUMN "reason";
ALTER TABLE "FeedReport" RENAME COLUMN "reason_new" TO "reason";
ALTER TABLE "FeedReport" ALTER COLUMN "reason" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "FeedPost_visibility_idx" ON "FeedPost"("visibility");
CREATE INDEX IF NOT EXISTS "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");
CREATE INDEX IF NOT EXISTS "FeedStory_createdAt_idx" ON "FeedStory"("createdAt");
