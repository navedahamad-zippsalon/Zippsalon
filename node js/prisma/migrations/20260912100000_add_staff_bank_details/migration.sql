CREATE TYPE "StaffBankAccountType" AS ENUM ('SAVINGS', 'CURRENT', 'SALARY', 'OTHER');

CREATE TABLE "StaffBankDetails" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "encryptedAccountNumber" TEXT NOT NULL,
  "ifscCode" TEXT NOT NULL,
  "bankCode" TEXT NOT NULL,
  "accountType" "StaffBankAccountType" NOT NULL,
  "branchName" TEXT,
  "upiId" TEXT,
  "upiName" TEXT,
  "upiUri" TEXT,
  "qrCode" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffBankDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffBankDetails_staffId_key" ON "StaffBankDetails"("staffId");
ALTER TABLE "StaffBankDetails" ADD CONSTRAINT "StaffBankDetails_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "action", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v."action", v."description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('staff_bank_details.view', 'View own staff bank details'),
  ('staff_bank_details.create', 'Create own staff bank details'),
  ('staff_bank_details.update', 'Update own staff bank details'),
  ('staff_bank_details.delete', 'Delete own staff bank details'),
  ('staff_bank_details.qr', 'Generate own staff UPI QR code')
) AS v("action", "description")
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."action" = v."action");

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
  AND p."action" LIKE 'staff_bank_details.%'
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id");