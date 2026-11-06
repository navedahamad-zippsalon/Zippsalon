-- CreateIndex
CREATE INDEX "Attendance_date_staffId_idx" ON "Attendance"("date", "staffId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_status_idx" ON "Payment"("createdAt", "status");

-- CreateIndex
CREATE INDEX "SalonCustomer_salonId_createdAt_idx" ON "SalonCustomer"("salonId", "createdAt");
