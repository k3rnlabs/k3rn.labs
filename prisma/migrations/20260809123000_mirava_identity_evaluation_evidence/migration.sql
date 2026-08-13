CREATE TABLE "StudioIdentityEvaluation" (
  "id" TEXT NOT NULL,
  "creationId" TEXT NOT NULL,
  "identityProfileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioIdentityEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudioIdentityEvaluation_stage_check" CHECK ("stage" IN ('pass-a', 'pass-b')),
  CONSTRAINT "StudioIdentityEvaluation_decision_check" CHECK ("decision" IN ('PASS', 'FAIL', 'UNSCORABLE'))
);

CREATE INDEX "StudioIdentityEvaluation_creationId_frameIndex_stage_idx"
  ON "StudioIdentityEvaluation"("creationId", "frameIndex", "stage");
CREATE INDEX "StudioIdentityEvaluation_identityProfileId_createdAt_idx"
  ON "StudioIdentityEvaluation"("identityProfileId", "createdAt");
CREATE INDEX "StudioIdentityEvaluation_userId_createdAt_idx"
  ON "StudioIdentityEvaluation"("userId", "createdAt");

ALTER TABLE "StudioIdentityEvaluation"
  ADD CONSTRAINT "StudioIdentityEvaluation_creationId_fkey"
  FOREIGN KEY ("creationId") REFERENCES "StudioCreation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioIdentityEvaluation"
  ADD CONSTRAINT "StudioIdentityEvaluation_identityProfileId_fkey"
  FOREIGN KEY ("identityProfileId") REFERENCES "StudioIdentityProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioIdentityEvaluation"
  ADD CONSTRAINT "StudioIdentityEvaluation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
