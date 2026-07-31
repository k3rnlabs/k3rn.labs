-- AlterTable: add physicalTraits JSONB column to StudioIdentityProfile (idempotent)
ALTER TABLE "StudioIdentityProfile" ADD COLUMN IF NOT EXISTS "physicalTraits" JSONB;
