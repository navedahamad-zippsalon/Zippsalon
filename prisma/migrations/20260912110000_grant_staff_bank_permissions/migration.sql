INSERT INTO "StaffRolePermission" ("id", "staffRoleId", "permissionId")
SELECT gen_random_uuid(), sr."staffRoleId", p."id"
FROM "SalonStaff" sr
CROSS JOIN "Permission" p
WHERE sr."staffRoleId" IS NOT NULL
  AND p."action" LIKE 'staff_bank_details.%'
  AND NOT EXISTS (
    SELECT 1 FROM "StaffRolePermission" existing
    WHERE existing."staffRoleId" = sr."staffRoleId" AND existing."permissionId" = p."id"
  );
