-- AlterTable: add physicalTraits JSONB column to StudioIdentityProfile
ALTER TABLE "StudioIdentityProfile" ADD COLUMN "physicalTraits" JSONB;
