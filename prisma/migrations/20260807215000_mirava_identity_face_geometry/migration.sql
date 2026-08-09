ALTER TABLE "StudioIdentityAsset"
ADD COLUMN IF NOT EXISTS "faceGeometry" JSONB;
