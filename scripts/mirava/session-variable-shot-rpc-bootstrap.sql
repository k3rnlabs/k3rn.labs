\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'anon'
  ) THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'authenticated'
  ) THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'service_role'
  ) THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

CREATE TYPE "StudioCreationStatus" AS ENUM (
  'DRAFT',
  'ANALYSIS_QUEUED',
  'ANALYSING',
  'MASTER_PROMPT_READY',
  'GENERATION_QUEUED',
  'GENERATING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "StudioJobKind" AS ENUM (
  'ANALYZE',
  'GENERATE',
  'PURGE'
);

CREATE TYPE "StudioJobStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'DONE',
  'FAILED'
);

CREATE TYPE "StudioCreditEntryKind" AS ENUM (
  'ACTIVATION_GRANT',
  'SUBSCRIPTION_GRANT',
  'RESERVATION',
  'ANALYSIS_DEBIT',
  'RESERVATION_RELEASE',
  'COMPENSATION',
  'PURCHASE',
  'EXPIRATION'
);

CREATE TYPE "StudioCreditLotKind" AS ENUM (
  'ACTIVATION',
  'SUBSCRIPTION',
  'PURCHASE',
  'COMPENSATION',
  'MIGRATION'
);

CREATE TYPE "StudioCreditAllocationState" AS ENUM (
  'RESERVED',
  'DEBITED',
  'RELEASED'
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "studioCredits" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "StudioSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "identityProfileId" TEXT,
  "builderVersion" INTEGER,
  "setPresetId" TEXT,
  "lightingPresetId" TEXT,
  "builderConfig" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
);

CREATE TABLE "StudioCreation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "identityProfileId" TEXT,
  "sessionId" TEXT,
  "parentCreationId" TEXT,
  "shotIndex" INTEGER NOT NULL DEFAULT 0,
  "shotIntent" TEXT,
  "creativeOptions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "StudioCreationStatus" NOT NULL DEFAULT 'DRAFT',
  "masterPrompt" TEXT,
  "negativePrompt" TEXT,
  "creditReservationKey" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE,

  FOREIGN KEY ("sessionId")
    REFERENCES "StudioSession"("id")
    ON DELETE SET NULL,

  FOREIGN KEY ("parentCreationId")
    REFERENCES "StudioCreation"("id")
    ON DELETE SET NULL,

  UNIQUE ("sessionId", "shotIndex")
);

CREATE TABLE "StudioJob" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL,
  "kind" "StudioJobKind" NOT NULL,
  "status" "StudioJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY ("creationId")
    REFERENCES "StudioCreation"("id")
    ON DELETE CASCADE,

  UNIQUE ("creationId", "kind")
);

CREATE TABLE "StudioCreditLedger" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "creationId" TEXT,
  "kind" "StudioCreditEntryKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE,

  FOREIGN KEY ("creationId")
    REFERENCES "StudioCreation"("id")
    ON DELETE SET NULL
);

CREATE TABLE "StudioCreditLot" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "kind" "StudioCreditLotKind" NOT NULL,
  "originalAmount" INTEGER NOT NULL CHECK ("originalAmount" > 0),
  "remaining" INTEGER NOT NULL CHECK ("remaining" >= 0),
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
);

CREATE TABLE "StudioCreditAllocation" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "state" "StudioCreditAllocationState"
    NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY ("creationId")
    REFERENCES "StudioCreation"("id")
    ON DELETE CASCADE,

  FOREIGN KEY ("lotId")
    REFERENCES "StudioCreditLot"("id")
    ON DELETE CASCADE,

  UNIQUE ("creationId", "lotId")
);

CREATE OR REPLACE FUNCTION public.reserve_mirava_credit(
  p_user_id TEXT,
  p_creation_id TEXT,
  p_key TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_existing INTEGER;
  v_needed INTEGER := p_amount;
  v_take INTEGER;
  lot RECORD;
BEGIN
  SELECT "balanceAfter"
  INTO v_existing
  FROM "StudioCreditLedger"
  WHERE "idempotencyKey" = p_key;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'MIRAVA_CREDIT_AMOUNT_INVALID';
  END IF;

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE "id" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio user not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_STUDIO_CREDITS';
  END IF;

  FOR lot IN
    SELECT *
    FROM "StudioCreditLot"
    WHERE
      "userId" = p_user_id
      AND "remaining" > 0
      AND (
        "expiresAt" IS NULL
        OR "expiresAt" > NOW()
      )
    ORDER BY
      "expiresAt" NULLS LAST,
      "createdAt" ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_needed = 0;

    v_take := LEAST(
      v_needed,
      lot."remaining"
    );

    UPDATE "StudioCreditLot"
    SET
      "remaining" = "remaining" - v_take,
      "updatedAt" = NOW()
    WHERE "id" = lot."id";

    INSERT INTO "StudioCreditAllocation" (
      "id",
      "creationId",
      "lotId",
      "amount",
      "state"
    )
    VALUES (
      p_key || ':' || lot."id",
      p_creation_id,
      lot."id",
      v_take,
      'RESERVED'
    );

    v_needed := v_needed - v_take;
  END LOOP;

  IF v_needed <> 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STUDIO_CREDITS';
  END IF;

  v_balance := v_balance - p_amount;

  UPDATE "User"
  SET "studioCredits" = v_balance
  WHERE "id" = p_user_id;

  INSERT INTO "StudioCreditLedger" (
    "id",
    "userId",
    "creationId",
    "kind",
    "amount",
    "balanceAfter",
    "idempotencyKey"
  )
  VALUES (
    p_key,
    p_user_id,
    p_creation_id,
    'RESERVATION',
    -p_amount,
    v_balance,
    p_key
  );

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_mirava_credit_reservation(
  p_user_id TEXT,
  p_creation_id TEXT,
  p_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_existing INTEGER;
BEGIN
  SELECT "balanceAfter"
  INTO v_existing
  FROM "StudioCreditLedger"
  WHERE "idempotencyKey" = p_key;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE "id" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio user not found';
  END IF;

  UPDATE "StudioCreditAllocation"
  SET
    "state" = 'DEBITED',
    "updatedAt" = NOW()
  WHERE
    "creationId" = p_creation_id
    AND "state" = 'RESERVED';

  INSERT INTO "StudioCreditLedger" (
    "id",
    "userId",
    "creationId",
    "kind",
    "amount",
    "balanceAfter",
    "idempotencyKey"
  )
  VALUES (
    p_key,
    p_user_id,
    p_creation_id,
    'ANALYSIS_DEBIT',
    0,
    v_balance,
    p_key
  );

  RETURN v_balance;
END;
$$;

COMMIT;
