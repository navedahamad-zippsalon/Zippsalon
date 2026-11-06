UPDATE "SubscriptionPlan"
SET "slug" = 'FREE_LEGACY_' || substring("id" from 1 for 8), "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("slug") = 'free' AND "slug" <> 'FREE';

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_slug_lower_key" ON "SubscriptionPlan" (lower("slug"));