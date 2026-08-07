-- MIRAVA Session Builder V1
-- Extends the existing StudioSession continuity model.
-- Existing non-builder sessions remain valid because all builder fields are nullable.

ALTER TABLE "StudioSession"
ADD COLUMN IF NOT EXISTS "builderVersion" INTEGER,
ADD COLUMN IF NOT EXISTS "setPresetId" TEXT,
ADD COLUMN IF NOT EXISTS "lightingPresetId" TEXT,
ADD COLUMN IF NOT EXISTS "builderConfig" JSONB;

CREATE TABLE IF NOT EXISTS "StudioSessionLookItem" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT,
  "brand" TEXT,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudioSessionLookItem_pkey"
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudioSessionLookAsset" (
  "id" TEXT NOT NULL,
  "lookItemId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "viewKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudioSessionLookAsset_pkey"
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS
"StudioSessionLookItem_sessionId_position_idx"
ON "StudioSessionLookItem"(
  "sessionId",
  "position"
);

CREATE UNIQUE INDEX IF NOT EXISTS
"StudioSessionLookAsset_storagePath_key"
ON "StudioSessionLookAsset"(
  "storagePath"
);

CREATE INDEX IF NOT EXISTS
"StudioSessionLookAsset_lookItemId_createdAt_idx"
ON "StudioSessionLookAsset"(
  "lookItemId",
  "createdAt"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'StudioSessionLookItem_sessionId_fkey'
  ) THEN
    ALTER TABLE "StudioSessionLookItem"
    ADD CONSTRAINT
      "StudioSessionLookItem_sessionId_fkey"
    FOREIGN KEY ("sessionId")
    REFERENCES "StudioSession"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'StudioSessionLookAsset_lookItemId_fkey'
  ) THEN
    ALTER TABLE "StudioSessionLookAsset"
    ADD CONSTRAINT
      "StudioSessionLookAsset_lookItemId_fkey"
    FOREIGN KEY ("lookItemId")
    REFERENCES "StudioSessionLookItem"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
