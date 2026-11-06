-- Supports salon/status filtering and newest-first staff pagination.
CREATE INDEX "SalonStaff_salonId_isActive_createdAt_idx"
ON "SalonStaff"("salonId", "isActive", "createdAt" DESC);
