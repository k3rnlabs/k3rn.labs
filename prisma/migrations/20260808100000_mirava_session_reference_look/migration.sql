ALTER TABLE "StudioSession" ADD COLUMN IF NOT EXISTS "referenceCreationId" TEXT;
CREATE INDEX IF NOT EXISTS "StudioSession_referenceCreationId_idx" ON "StudioSession"("referenceCreationId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudioSession_referenceCreationId_fkey') THEN
    ALTER TABLE "StudioSession" ADD CONSTRAINT "StudioSession_referenceCreationId_fkey"
    FOREIGN KEY ("referenceCreationId") REFERENCES "StudioCreation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
