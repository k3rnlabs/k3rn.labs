CREATE TABLE IF NOT EXISTS public."StudioIdentityEvaluation" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL REFERENCES public."StudioCreation"("id") ON DELETE CASCADE,
  "identityProfileId" TEXT NOT NULL REFERENCES public."StudioIdentityProfile"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "frameIndex" INTEGER NOT NULL,
  "stage" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "aggregateSimilarity" DOUBLE PRECISION,
  "threshold" DOUBLE PRECISION,
  "perReferenceSimilarity" JSONB NOT NULL,
  "evaluator" JSONB NOT NULL,
  "candidateFace" JSONB NOT NULL,
  "identityManifestVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StudioIdentityEvaluation_stage_check" CHECK ("stage" IN ('pass-a', 'pass-b')),
  CONSTRAINT "StudioIdentityEvaluation_decision_check" CHECK ("decision" IN ('PASS', 'FAIL', 'UNSCORABLE'))
);

CREATE INDEX IF NOT EXISTS "StudioIdentityEvaluation_creationId_frameIndex_stage_idx"
  ON public."StudioIdentityEvaluation"("creationId", "frameIndex", "stage");
CREATE INDEX IF NOT EXISTS "StudioIdentityEvaluation_identityProfileId_createdAt_idx"
  ON public."StudioIdentityEvaluation"("identityProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudioIdentityEvaluation_userId_createdAt_idx"
  ON public."StudioIdentityEvaluation"("userId", "createdAt");

ALTER TABLE public."StudioIdentityEvaluation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."StudioIdentityEvaluation" FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public."StudioIdentityEvaluation" TO service_role;
