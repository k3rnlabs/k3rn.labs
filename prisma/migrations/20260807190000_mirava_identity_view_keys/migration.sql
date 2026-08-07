ALTER TABLE "StudioIdentityAsset"
ADD COLUMN IF NOT EXISTS "viewKey" TEXT;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "identityProfileId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "StudioIdentityAsset"
)
UPDATE "StudioIdentityAsset" AS asset
SET "viewKey" = CASE
  WHEN ranked.rn = 1 THEN 'front'
  WHEN ranked.rn = 2 THEN 'angle'
  WHEN ranked.rn = 3 THEN 'profile_right'
  WHEN ranked.rn = 4 THEN 'smile'
  WHEN ranked.rn = 5 THEN 'body'
  ELSE 'tattoos'
END
FROM ranked
WHERE
  asset."id" = ranked."id"
  AND asset."viewKey" IS NULL;

CREATE INDEX IF NOT EXISTS
"StudioIdentityAsset_identityProfileId_viewKey_idx"
ON "StudioIdentityAsset"(
  "identityProfileId",
  "viewKey"
);
