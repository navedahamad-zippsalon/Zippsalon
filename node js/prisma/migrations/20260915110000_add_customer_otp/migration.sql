ALTER TYPE "UserSource" ADD VALUE IF NOT EXISTS 'CUSTOMER';

CREATE TABLE "CustomerOtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "channel" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerOtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerOtpChallenge_email_channel_createdAt_idx" ON "CustomerOtpChallenge"("email", "channel", "createdAt");
CREATE INDEX "CustomerOtpChallenge_phone_channel_createdAt_idx" ON "CustomerOtpChallenge"("phone", "channel", "createdAt");
ALTER TABLE "CustomerOtpChallenge" ADD CONSTRAINT "CustomerOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;