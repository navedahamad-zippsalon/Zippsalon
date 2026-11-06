CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "CouponOwnerType" AS ENUM ('ADMIN', 'VENDOR');
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'REFERRAL_REWARD', 'PROMOTIONAL_REWARD', 'BOOKING_ADJUSTMENT');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "AdvertisementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

CREATE TABLE "Coupon" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "ownerType" "CouponOwnerType" NOT NULL, "ownerId" TEXT NOT NULL, "salonId" TEXT, "branchId" TEXT, "serviceId" TEXT, "discountType" "CouponDiscountType" NOT NULL, "discountValue" DOUBLE PRECISION NOT NULL, "minimumOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0, "maximumDiscount" DOUBLE PRECISION, "usageLimit" INTEGER, "usagePerCustomer" INTEGER, "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_ownerId_isActive_idx" ON "Coupon"("ownerId", "isActive");
CREATE INDEX "Coupon_salonId_branchId_serviceId_idx" ON "Coupon"("salonId", "branchId", "serviceId");
CREATE INDEX "Coupon_startAt_endAt_idx" ON "Coupon"("startAt", "endAt");

CREATE TABLE "CouponRedemption" ("id" TEXT NOT NULL, "couponId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "bookingId" TEXT, "amount" DOUBLE PRECISION NOT NULL, "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"));
CREATE INDEX "CouponRedemption_customerId_couponId_idx" ON "CouponRedemption"("customerId", "couponId");
CREATE INDEX "CouponRedemption_bookingId_idx" ON "CouponRedemption"("bookingId");

CREATE TABLE "Review" ("id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "bookingId" TEXT NOT NULL, "salonId" TEXT NOT NULL, "branchId" TEXT, "staffId" TEXT, "rating" INTEGER NOT NULL, "comment" TEXT, "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Review_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Review_customerId_bookingId_key" ON "Review"("customerId", "bookingId");
CREATE INDEX "Review_salonId_status_idx" ON "Review"("salonId", "status");
CREATE INDEX "Review_staffId_status_idx" ON "Review"("staffId", "status");

CREATE TABLE "CustomerWallet" ("id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "balance" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'INR', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CustomerWallet_customerId_key" ON "CustomerWallet"("customerId");
CREATE TABLE "WalletTransaction" ("id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "type" "WalletTransactionType" NOT NULL, "amount" DOUBLE PRECISION NOT NULL, "referenceType" TEXT, "referenceId" TEXT, "description" TEXT, "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id"));
CREATE INDEX "WalletTransaction_customerId_createdAt_idx" ON "WalletTransaction"("customerId", "createdAt");
CREATE INDEX "WalletTransaction_referenceType_referenceId_idx" ON "WalletTransaction"("referenceType", "referenceId");

CREATE TABLE "ReferralConfig" ("id" TEXT NOT NULL, "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0, "campaignActive" BOOLEAN NOT NULL DEFAULT false, "qualification" JSONB, "expiresAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CustomerReferral" ("id" TEXT NOT NULL, "referrerCustomerId" TEXT NOT NULL, "referredCustomerId" TEXT, "referralCode" TEXT NOT NULL, "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING', "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0, "rewardStatus" "RewardStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CustomerReferral_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CustomerReferral_referralCode_key" ON "CustomerReferral"("referralCode");
CREATE INDEX "CustomerReferral_referrerCustomerId_idx" ON "CustomerReferral"("referrerCustomerId");
CREATE INDEX "CustomerReferral_referredCustomerId_idx" ON "CustomerReferral"("referredCustomerId");

CREATE TABLE "Advertisement" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "image" TEXT, "media" TEXT, "targetType" TEXT, "targetId" TEXT, "salonId" TEXT, "branchId" TEXT, "serviceId" TEXT, "ctaText" TEXT, "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "priority" INTEGER NOT NULL DEFAULT 0, "status" "AdvertisementStatus" NOT NULL DEFAULT 'DRAFT', "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Advertisement_status_startAt_endAt_idx" ON "Advertisement"("status", "startAt", "endAt");

CREATE TABLE "CustomerAddress" ("id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "label" TEXT NOT NULL, "addressLine1" TEXT NOT NULL, "addressLine2" TEXT, "city" TEXT NOT NULL, "state" TEXT NOT NULL, "country" TEXT NOT NULL, "postalCode" TEXT NOT NULL, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "isDefault" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"));
CREATE INDEX "CustomerAddress_customerId_isDefault_idx" ON "CustomerAddress"("customerId", "isDefault");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerWallet" ADD CONSTRAINT "CustomerWallet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CustomerWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReferral" ADD CONSTRAINT "CustomerReferral_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReferral" ADD CONSTRAINT "CustomerReferral_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
