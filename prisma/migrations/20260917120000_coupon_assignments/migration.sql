ALTER TABLE "Booking" ADD COLUMN "couponId" TEXT;

CREATE TABLE "CouponVendor" (
  "couponId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  CONSTRAINT "CouponVendor_pkey" PRIMARY KEY ("couponId", "vendorId")
);
CREATE INDEX "CouponVendor_vendorId_idx" ON "CouponVendor"("vendorId");
CREATE TABLE "CouponSalon" (
  "couponId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  CONSTRAINT "CouponSalon_pkey" PRIMARY KEY ("couponId", "salonId")
);
CREATE INDEX "CouponSalon_salonId_idx" ON "CouponSalon"("salonId");
CREATE TABLE "CouponBranch" (
  "couponId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  CONSTRAINT "CouponBranch_pkey" PRIMARY KEY ("couponId", "branchId")
);
CREATE INDEX "CouponBranch_branchId_idx" ON "CouponBranch"("branchId");
CREATE TABLE "CouponService" (
  "couponId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "CouponService_pkey" PRIMARY KEY ("couponId", "serviceId")
);
CREATE INDEX "CouponService_serviceId_idx" ON "CouponService"("serviceId");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponVendor" ADD CONSTRAINT "CouponVendor_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponVendor" ADD CONSTRAINT "CouponVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponSalon" ADD CONSTRAINT "CouponSalon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponSalon" ADD CONSTRAINT "CouponSalon_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponBranch" ADD CONSTRAINT "CouponBranch_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponBranch" ADD CONSTRAINT "CouponBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponService" ADD CONSTRAINT "CouponService_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponService" ADD CONSTRAINT "CouponService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
