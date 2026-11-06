UPDATE "Menu"
SET "label" = 'Tracking'
WHERE "path" = '/admin/tracking' AND "parentId" IS NULL AND "label" = 'CRM Tracking';

UPDATE "Menu" child
SET "label" = 'Tracking Overview'
FROM "Menu" parent
WHERE child."parentId" = parent."id"
  AND parent."path" = '/admin/tracking'
  AND child."path" = '/admin/tracking'
  AND child."label" = 'Overview';
