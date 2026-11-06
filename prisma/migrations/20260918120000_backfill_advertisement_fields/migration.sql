UPDATE "Advertisement"
SET "targetAudience" = CASE
  WHEN UPPER(COALESCE("targetType", '')) LIKE '%CUSTOMER%' THEN 'CUSTOMER'::"AdvertisementTargetAudience"
  WHEN UPPER(COALESCE("targetType", '')) LIKE '%VENDOR%' THEN 'VENDOR'::"AdvertisementTargetAudience"
  ELSE "targetAudience"
END,
"mediaUrl" = COALESCE("mediaUrl", "media", "image"),
"mediaType" = CASE
  WHEN COALESCE("mediaUrl", "media", "image") IS NOT NULL THEN 'IMAGE'::"AdvertisementMediaType"
  ELSE "mediaType"
END,
"actionButtonName" = COALESCE("actionButtonName", "ctaText"),
"actionEnabled" = (COALESCE("actionEnabled", false) OR "ctaText" IS NOT NULL),
"displayOrder" = CASE WHEN "displayOrder" = 0 THEN "priority" ELSE "displayOrder" END
WHERE "deletedAt" IS NULL;
