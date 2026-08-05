-- MIRAVA compliance lot 1: append-only evidence of legal and analytics decisions.
CREATE TABLE IF NOT EXISTS "StudioConsentEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudioConsentEvent_userId_purpose_createdAt_idx"
  ON "StudioConsentEvent"("userId", "purpose", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudioConsentEvent_userId_fkey'
  ) THEN
    ALTER TABLE "StudioConsentEvent"
      ADD CONSTRAINT "StudioConsentEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
