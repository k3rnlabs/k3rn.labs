-- MIRAVA personal studios and reusable identity profiles.
-- All access remains server-only: RLS is enabled without browser policies.

CREATE TABLE IF NOT EXISTS public."StudioProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "sourceCreationId" TEXT UNIQUE REFERENCES public."StudioCreation"("id") ON DELETE SET NULL,
  "presetId" TEXT,
  "name" TEXT NOT NULL,
  "creativeDirectionSummary" TEXT,
  "masterPrompt" TEXT,
  "negativePrompt" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."StudioIdentityProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES public."User"("id") ON DELETE CASCADE,
  "retentionAcceptedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."StudioIdentityAsset" (
  "id" TEXT PRIMARY KEY,
  "identityProfileId" TEXT NOT NULL REFERENCES public."StudioIdentityProfile"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "storagePath" TEXT NOT NULL UNIQUE,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL CHECK ("bytes" > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."StudioCreation"
  ADD COLUMN IF NOT EXISTS "studioProfileId" TEXT REFERENCES public."StudioProfile"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "identityProfileId" TEXT REFERENCES public."StudioIdentityProfile"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "presetId" TEXT,
  ADD COLUMN IF NOT EXISTS "creativeOptions" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "StudioProfile_userId_createdAt_idx" ON public."StudioProfile" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudioIdentityAsset_profile_createdAt_idx" ON public."StudioIdentityAsset" ("identityProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudioCreation_studioProfileId_createdAt_idx" ON public."StudioCreation" ("studioProfileId", "createdAt" DESC);

ALTER TABLE public."StudioProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudioIdentityProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudioIdentityAsset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."StudioProfile", public."StudioIdentityProfile", public."StudioIdentityAsset" FROM PUBLIC, anon, authenticated;
