CREATE TYPE "BookingSource" AS ENUM ('APP', 'WEB');

ALTER TABLE "Booking"
ADD COLUMN "bookingSource" "BookingSource";

CREATE INDEX "Booking_bookingSource_idx" ON "Booking"("bookingSource");
