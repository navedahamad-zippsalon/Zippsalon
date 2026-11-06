-- Supports the dashboard's scoped date/status aggregations without changing
-- existing data or constraints.
CREATE INDEX IF NOT EXISTS "Booking_salonId_branchId_bookingDate_status_idx"
ON "Booking" ("salonId", "branchId", "bookingDate", "status");
