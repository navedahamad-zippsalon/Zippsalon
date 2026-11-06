-- Supports the staff performance aggregate by assigned staff, period, and status.
CREATE INDEX "Booking_staffId_bookingDate_status_idx"
ON "Booking"("staffId", "bookingDate", "status");
