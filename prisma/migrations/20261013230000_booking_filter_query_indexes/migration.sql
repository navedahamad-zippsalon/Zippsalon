CREATE INDEX IF NOT EXISTS "Booking_bookingDate_idx" ON "Booking"("bookingDate");
CREATE INDEX IF NOT EXISTS "Booking_status_bookingDate_idx" ON "Booking"("status", "bookingDate");
CREATE INDEX IF NOT EXISTS "BookingService_bookingId_idx" ON "BookingService"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingService_serviceId_bookingId_idx" ON "BookingService"("serviceId", "bookingId");
CREATE INDEX IF NOT EXISTS "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");
