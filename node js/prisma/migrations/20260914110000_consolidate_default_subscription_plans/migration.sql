DO $$
DECLARE
  canonical_free_id TEXT;
BEGIN
  SELECT "id" INTO canonical_free_id FROM "SubscriptionPlan" WHERE "slug" = 'FREE' LIMIT 1;
  IF canonical_free_id IS NULL THEN
    canonical_free_id := gen_random_uuid()::text;
    INSERT INTO "SubscriptionPlan" (
      "id", "name", "slug", "description", "shortDescription", "monthlyPrice", "annualPrice", "currency",
      "monthlyEnabled", "annualEnabled", "isActive", "displayOrder", "createdAt", "updatedAt"
    ) VALUES (
      canonical_free_id, 'Free', 'FREE', 'Dummy Free plan for testing.', 'Free salon subscription.', 0, 0, 'INR',
      true, true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;

  UPDATE "Subscription"
  SET "planId" = canonical_free_id
  WHERE "planId" IN (SELECT "id" FROM "SubscriptionPlan" WHERE lower("slug") = 'free' AND "id" <> canonical_free_id)
    AND "status" IN ('ACTIVE', 'TRIALING', 'PAST_DUE');

  UPDATE "SubscriptionPlan"
  SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
  WHERE lower("slug") = 'free' AND "id" <> canonical_free_id;
END $$;