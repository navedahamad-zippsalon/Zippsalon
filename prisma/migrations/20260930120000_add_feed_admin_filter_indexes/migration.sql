-- Additive indexes used by the paginated Admin feed management filters.
CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");
CREATE INDEX "FeedPost_vendorId_status_createdAt_idx" ON "FeedPost"("vendorId", "status", "createdAt");
CREATE INDEX "FeedPost_salonId_branchId_staffId_createdAt_idx" ON "FeedPost"("salonId", "branchId", "staffId", "createdAt");

CREATE INDEX "FeedStory_createdAt_idx" ON "FeedStory"("createdAt");
CREATE INDEX "FeedStory_vendorId_status_createdAt_idx" ON "FeedStory"("vendorId", "status", "createdAt");
CREATE INDEX "FeedStory_salonId_branchId_staffId_createdAt_idx" ON "FeedStory"("salonId", "branchId", "staffId", "createdAt");
