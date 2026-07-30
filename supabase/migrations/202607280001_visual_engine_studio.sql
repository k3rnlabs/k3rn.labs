-- Visual Engine Studio: isolated creations, private assets, durable jobs and credit ledger.

DO $$ BEGIN
  CREATE TYPE "StudioCreationStatus" AS ENUM ('DRAFT', 'ANALYSIS_QUEUED', 'ANALYSING', 'MASTER_PROMPT_READY', 'GENERATION_QUEUED', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudioAssetKind" AS ENUM ('REFERENCE', 'IDENTITY', 'RESULT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudioJobKind" AS ENUM ('ANALYZE', 'GENERATE', 'PURGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudioJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudioCreditEntryKind" AS ENUM ('ACTIVATION_GRANT', 'RESERVATION', 'ANALYSIS_DEBIT', 'RESERVATION_RELEASE', 'COMPENSATION', 'PURCHASE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "studioCredits" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "StudioCreation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "dossierId" TEXT REFERENCES "Dossier"("id") ON DELETE SET NULL,
  "status" "StudioCreationStatus" NOT NULL DEFAULT 'DRAFT',
  "creativeDirectionSummary" TEXT,
  "masterPrompt" TEXT,
  "negativePrompt" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "creditReservationKey" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "StudioCreation_userId_createdAt_idx" ON "StudioCreation"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudioCreation_status_createdAt_idx" ON "StudioCreation"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "StudioAsset" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL REFERENCES "StudioCreation"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" "StudioAssetKind" NOT NULL,
  "storagePath" TEXT NOT NULL UNIQUE,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StudioAsset_creationId_kind_idx" ON "StudioAsset"("creationId", "kind");
CREATE INDEX IF NOT EXISTS "StudioAsset_userId_expiresAt_idx" ON "StudioAsset"("userId", "expiresAt");

CREATE TABLE IF NOT EXISTS "StudioConsent" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL UNIQUE REFERENCES "StudioCreation"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "version" TEXT NOT NULL,
  "ageConfirmed" BOOLEAN NOT NULL,
  "rightsConfirmed" BOOLEAN NOT NULL,
  "privacyAccepted" BOOLEAN NOT NULL,
  "openaiDisclosureAccepted" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StudioJob" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL REFERENCES "StudioCreation"("id") ON DELETE CASCADE,
  "kind" "StudioJobKind" NOT NULL,
  "status" "StudioJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRunAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lockedAt" TIMESTAMPTZ,
  "failureCode" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StudioJob_status_nextRunAt_idx" ON "StudioJob"("status", "nextRunAt");
CREATE INDEX IF NOT EXISTS "StudioJob_creationId_kind_idx" ON "StudioJob"("creationId", "kind");

CREATE TABLE IF NOT EXISTS "StudioCreditLedger" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "creationId" TEXT REFERENCES "StudioCreation"("id") ON DELETE SET NULL,
  "kind" "StudioCreditEntryKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "stripeSessionId" TEXT UNIQUE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StudioCreditLedger_userId_createdAt_idx" ON "StudioCreditLedger"("userId", "createdAt" DESC);

-- Applies a ledger mutation and the cached balance in one transaction. `p_key` is
-- caller-supplied and makes webhook/retry paths exactly-once.
CREATE OR REPLACE FUNCTION public.apply_studio_credit_delta(
  p_user_id TEXT,
  p_creation_id TEXT,
  p_kind TEXT,
  p_amount INTEGER,
  p_key TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_existing INTEGER;
BEGIN
  SELECT "balanceAfter" INTO v_existing
  FROM "StudioCreditLedger"
  WHERE "idempotencyKey" = p_key;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT "studioCredits" INTO v_balance
  FROM "User"
  WHERE "id" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio user not found';
  END IF;

  v_balance := v_balance + p_amount;
  IF v_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STUDIO_CREDITS';
  END IF;

  UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = p_user_id;

  INSERT INTO "StudioCreditLedger" (
    "id", "userId", "creationId", "kind", "amount", "balanceAfter",
    "idempotencyKey", "stripeSessionId", "metadata"
  ) VALUES (
    p_key, p_user_id, NULLIF(p_creation_id, ''), p_kind::"StudioCreditEntryKind",
    p_amount, v_balance, p_key, NULLIF(p_stripe_session_id, ''), p_metadata
  );

  RETURN v_balance;
END;
$$;

-- The application only uses service-role storage operations for this bucket.
-- No public or authenticated read policy is deliberately created.
INSERT INTO storage.buckets (id, name, public)
VALUES ('visual-engine-private', 'visual-engine-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;
