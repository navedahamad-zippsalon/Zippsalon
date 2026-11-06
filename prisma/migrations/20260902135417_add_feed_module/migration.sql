-- CreateEnum
CREATE TYPE "FeedMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "FeedPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FeedStoryStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FeedReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedShareChannel" AS ENUM ('COPY_LINK', 'DIRECT_MESSAGE', 'WHATSAPP', 'OTHER');

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "caption" TEXT,
    "status" "FeedPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedStory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "branchId" TEXT,
    "caption" TEXT,
    "status" "FeedStoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "storyId" TEXT,
    "type" "FeedMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPostView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPostView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedStoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedStoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "FeedShareChannel" NOT NULL DEFAULT 'COPY_LINK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "storyId" TEXT,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "FeedReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedPost_vendorId_idx" ON "FeedPost"("vendorId");

-- CreateIndex
CREATE INDEX "FeedPost_salonId_idx" ON "FeedPost"("salonId");

-- CreateIndex
CREATE INDEX "FeedPost_branchId_idx" ON "FeedPost"("branchId");

-- CreateIndex
CREATE INDEX "FeedPost_status_idx" ON "FeedPost"("status");

-- CreateIndex
CREATE INDEX "FeedStory_vendorId_idx" ON "FeedStory"("vendorId");

-- CreateIndex
CREATE INDEX "FeedStory_salonId_idx" ON "FeedStory"("salonId");

-- CreateIndex
CREATE INDEX "FeedStory_status_expiresAt_idx" ON "FeedStory"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "FeedMedia_postId_idx" ON "FeedMedia"("postId");

-- CreateIndex
CREATE INDEX "FeedMedia_storyId_idx" ON "FeedMedia"("storyId");

-- CreateIndex
CREATE INDEX "FeedPostLike_postId_idx" ON "FeedPostLike"("postId");

-- CreateIndex
CREATE INDEX "FeedPostLike_userId_idx" ON "FeedPostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedPostLike_postId_userId_key" ON "FeedPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "FeedComment_postId_idx" ON "FeedComment"("postId");

-- CreateIndex
CREATE INDEX "FeedComment_userId_idx" ON "FeedComment"("userId");

-- CreateIndex
CREATE INDEX "FeedPostView_postId_idx" ON "FeedPostView"("postId");

-- CreateIndex
CREATE INDEX "FeedPostView_userId_idx" ON "FeedPostView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedPostView_postId_userId_key" ON "FeedPostView"("postId", "userId");

-- CreateIndex
CREATE INDEX "FeedStoryView_storyId_idx" ON "FeedStoryView"("storyId");

-- CreateIndex
CREATE INDEX "FeedStoryView_userId_idx" ON "FeedStoryView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedStoryView_storyId_userId_key" ON "FeedStoryView"("storyId", "userId");

-- CreateIndex
CREATE INDEX "FeedShare_postId_idx" ON "FeedShare"("postId");

-- CreateIndex
CREATE INDEX "FeedShare_userId_idx" ON "FeedShare"("userId");

-- CreateIndex
CREATE INDEX "FeedReport_postId_idx" ON "FeedReport"("postId");

-- CreateIndex
CREATE INDEX "FeedReport_storyId_idx" ON "FeedReport"("storyId");

-- CreateIndex
CREATE INDEX "FeedReport_status_idx" ON "FeedReport"("status");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedStory" ADD CONSTRAINT "FeedStory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedStory" ADD CONSTRAINT "FeedStory_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedStory" ADD CONSTRAINT "FeedStory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedMedia" ADD CONSTRAINT "FeedMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedMedia" ADD CONSTRAINT "FeedMedia_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FeedStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostLike" ADD CONSTRAINT "FeedPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostLike" ADD CONSTRAINT "FeedPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostView" ADD CONSTRAINT "FeedPostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPostView" ADD CONSTRAINT "FeedPostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedStoryView" ADD CONSTRAINT "FeedStoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FeedStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedStoryView" ADD CONSTRAINT "FeedStoryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShare" ADD CONSTRAINT "FeedShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShare" ADD CONSTRAINT "FeedShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedReport" ADD CONSTRAINT "FeedReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedReport" ADD CONSTRAINT "FeedReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FeedStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedReport" ADD CONSTRAINT "FeedReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedReport" ADD CONSTRAINT "FeedReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
