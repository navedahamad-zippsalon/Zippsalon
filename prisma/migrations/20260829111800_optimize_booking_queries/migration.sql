-- CreateIndex
CREATE INDEX "Booking_salonId_bookingDate_idx" ON "Booking"("salonId", "bookingDate");

-- CreateIndex
CREATE INDEX "Booking_salonId_status_bookingDate_idx" ON "Booking"("salonId", "status", "bookingDate");

-- CreateIndex
CREATE INDEX "Booking_staffId_bookingDate_idx" ON "Booking"("staffId", "bookingDate");
