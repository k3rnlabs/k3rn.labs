ALTER TABLE "StudioIdentityProfile"
ADD COLUMN IF NOT EXISTS "identityMorphology" JSONB;
