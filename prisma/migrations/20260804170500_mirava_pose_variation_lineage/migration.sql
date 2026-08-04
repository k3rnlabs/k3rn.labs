CREATE TYPE "StudioGenerationIntent" AS ENUM (
  'INITIAL',
  'REGENERATE',
  'POSE_VARIATION'
);

ALTER TABLE "StudioCreation"
  ADD COLUMN "generationIntent" "StudioGenerationIntent" NOT NULL DEFAULT 'INITIAL',
  ADD COLUMN "parentCreationId" TEXT,
  ADD COLUMN "rootCreationId" TEXT,
  ADD COLUMN "sourceResultIndex" INTEGER,
  ADD COLUMN "variationRequest" JSONB,
  ADD COLUMN "clientIdempotencyKey" TEXT;

CREATE INDEX "StudioCreation_parentCreationId_createdAt_idx"
  ON "StudioCreation"("parentCreationId", "createdAt");

CREATE INDEX "StudioCreation_rootCreationId_createdAt_idx"
  ON "StudioCreation"("rootCreationId", "createdAt");

CREATE INDEX "StudioCreation_generationIntent_createdAt_idx"
  ON "StudioCreation"("generationIntent", "createdAt");

CREATE UNIQUE INDEX "StudioCreation_userId_clientIdempotencyKey_key"
  ON "StudioCreation"("userId", "clientIdempotencyKey");

ALTER TABLE "StudioCreation"
  ADD CONSTRAINT "StudioCreation_parentCreationId_fkey"
  FOREIGN KEY ("parentCreationId")
  REFERENCES "StudioCreation"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "StudioCreation"
  ADD CONSTRAINT "StudioCreation_rootCreationId_fkey"
  FOREIGN KEY ("rootCreationId")
  REFERENCES "StudioCreation"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
