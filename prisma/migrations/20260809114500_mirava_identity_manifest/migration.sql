CREATE TABLE IF NOT EXISTS public."StudioIdentityManifest" (
  "id" TEXT PRIMARY KEY,
  "identityProfileId" TEXT NOT NULL
    REFERENCES public."StudioIdentityProfile"("id")
    ON DELETE CASCADE,
  "userId" TEXT NOT NULL
    REFERENCES public."User"("id")
    ON DELETE CASCADE,
  "schemaVersion" TEXT NOT NULL,
  "versionHash" TEXT NOT NULL,
  "assetManifest" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "StudioIdentityManifest_profile_version_key"
    UNIQUE ("identityProfileId", "versionHash")
);

CREATE INDEX IF NOT EXISTS
  "StudioIdentityManifest_userId_createdAt_idx"
ON public."StudioIdentityManifest" (
  "userId",
  "createdAt" DESC
);

ALTER TABLE public."StudioIdentityManifest"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."StudioIdentityManifest"
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public."StudioIdentityManifest"
  TO service_role;
