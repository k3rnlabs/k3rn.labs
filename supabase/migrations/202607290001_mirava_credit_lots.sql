-- MIRAVA: expiring subscription credits, permanent packs and encrypted push subscriptions.

ALTER TYPE "StudioCreditEntryKind" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_GRANT';
ALTER TYPE "StudioCreditEntryKind" ADD VALUE IF NOT EXISTS 'EXPIRATION';

DO $$ BEGIN
  CREATE TYPE "StudioCreditLotKind" AS ENUM ('ACTIVATION', 'SUBSCRIPTION', 'PURCHASE', 'COMPENSATION', 'MIGRATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudioCreditAllocationState" AS ENUM ('RESERVED', 'DEBITED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StudioCreditLot" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" "StudioCreditLotKind" NOT NULL,
  "originalAmount" INTEGER NOT NULL CHECK ("originalAmount" > 0),
  "remaining" INTEGER NOT NULL CHECK ("remaining" >= 0),
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "stripeSessionId" TEXT UNIQUE,
  "periodStart" TIMESTAMPTZ,
  "periodEnd" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "rolloverUsedAt" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StudioCreditLot_userId_expiresAt_idx" ON "StudioCreditLot"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "StudioCreditLot_userId_createdAt_idx" ON "StudioCreditLot"("userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "StudioCreditAllocation" (
  "id" TEXT PRIMARY KEY,
  "creationId" TEXT NOT NULL REFERENCES "StudioCreation"("id") ON DELETE CASCADE,
  "lotId" TEXT NOT NULL REFERENCES "StudioCreditLot"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "state" "StudioCreditAllocationState" NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("creationId", "lotId")
);
CREATE INDEX IF NOT EXISTS "StudioCreditAllocation_lotId_state_idx" ON "StudioCreditAllocation"("lotId", "state");

CREATE TABLE IF NOT EXISTS "StudioSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT UNIQUE,
  "planId" TEXT,
  "status" TEXT,
  "currentPeriodStart" TIMESTAMPTZ,
  "currentPeriodEnd" TIMESTAMPTZ,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StudioPushSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "encryptedPayload" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "StudioPushSubscription_userId_createdAt_idx" ON "StudioPushSubscription"("userId", "createdAt" DESC);

-- Existing Studio balance is retained forever as a migration lot before the new
-- allocator begins consuming expiring subscription credits first.
INSERT INTO "StudioCreditLot" ("id", "userId", "kind", "originalAmount", "remaining", "idempotencyKey", "metadata")
SELECT 'mirava-studio-migration:' || "id", "id", 'MIGRATION', "studioCredits", "studioCredits", 'mirava-studio-migration:' || "id", '{"source":"visual_engine"}'::jsonb
FROM "User"
WHERE "studioCredits" > 0
ON CONFLICT ("idempotencyKey") DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_mirava_credit_lot(
  p_user_id TEXT,
  p_lot_id TEXT,
  p_kind TEXT,
  p_amount INTEGER,
  p_key TEXT,
  p_ledger_kind TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_balance INTEGER; v_existing INTEGER;
BEGIN
  SELECT "balanceAfter" INTO v_existing FROM "StudioCreditLedger" WHERE "idempotencyKey" = p_key;
  IF FOUND THEN RETURN v_existing; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'MIRAVA_CREDIT_AMOUNT_INVALID'; END IF;
  SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio user not found'; END IF;
  v_balance := v_balance + p_amount;
  UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = p_user_id;
  INSERT INTO "StudioCreditLot" ("id", "userId", "kind", "originalAmount", "remaining", "idempotencyKey", "stripeSessionId", "periodStart", "periodEnd", "expiresAt", "metadata")
  VALUES (p_lot_id, p_user_id, p_kind::"StudioCreditLotKind", p_amount, p_amount, p_key, NULLIF(p_stripe_session_id, ''), p_period_start, p_period_end, p_expires_at, p_metadata);
  INSERT INTO "StudioCreditLedger" ("id", "userId", "kind", "amount", "balanceAfter", "idempotencyKey", "stripeSessionId", "metadata")
  VALUES (p_key, p_user_id, p_ledger_kind::"StudioCreditEntryKind", p_amount, v_balance, p_key, NULLIF(p_stripe_session_id, ''), p_metadata);
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_mirava_credit(
  p_user_id TEXT, p_creation_id TEXT, p_key TEXT, p_amount INTEGER DEFAULT 1
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_balance INTEGER; v_existing INTEGER; v_needed INTEGER := p_amount; v_take INTEGER; lot RECORD;
BEGIN
  SELECT "balanceAfter" INTO v_existing FROM "StudioCreditLedger" WHERE "idempotencyKey" = p_key;
  IF FOUND THEN RETURN v_existing; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'MIRAVA_CREDIT_AMOUNT_INVALID'; END IF;
  SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio user not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_STUDIO_CREDITS'; END IF;
  FOR lot IN
    SELECT * FROM "StudioCreditLot"
    WHERE "userId" = p_user_id AND "remaining" > 0 AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    ORDER BY "expiresAt" NULLS LAST, "createdAt" ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_needed = 0;
    v_take := LEAST(v_needed, lot."remaining");
    UPDATE "StudioCreditLot" SET "remaining" = "remaining" - v_take, "updatedAt" = NOW() WHERE "id" = lot."id";
    INSERT INTO "StudioCreditAllocation" ("id", "creationId", "lotId", "amount", "state")
    VALUES (p_key || ':' || lot."id", p_creation_id, lot."id", v_take, 'RESERVED');
    v_needed := v_needed - v_take;
  END LOOP;
  IF v_needed <> 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STUDIO_CREDITS'; END IF;
  v_balance := v_balance - p_amount;
  UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = p_user_id;
  INSERT INTO "StudioCreditLedger" ("id", "userId", "creationId", "kind", "amount", "balanceAfter", "idempotencyKey")
  VALUES (p_key, p_user_id, p_creation_id, 'RESERVATION', -p_amount, v_balance, p_key);
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_mirava_credit_reservation(
  p_user_id TEXT, p_creation_id TEXT, p_key TEXT, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_balance INTEGER; v_existing INTEGER; v_amount INTEGER := 0; allocation RECORD;
BEGIN
  SELECT "balanceAfter" INTO v_existing FROM "StudioCreditLedger" WHERE "idempotencyKey" = p_key;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio user not found'; END IF;
  FOR allocation IN SELECT * FROM "StudioCreditAllocation" WHERE "creationId" = p_creation_id AND "state" = 'RESERVED' FOR UPDATE LOOP
    UPDATE "StudioCreditLot" SET "remaining" = "remaining" + allocation."amount", "updatedAt" = NOW() WHERE "id" = allocation."lotId";
    UPDATE "StudioCreditAllocation" SET "state" = 'RELEASED', "updatedAt" = NOW() WHERE "id" = allocation."id";
    v_amount := v_amount + allocation."amount";
  END LOOP;
  v_balance := v_balance + v_amount;
  UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = p_user_id;
  INSERT INTO "StudioCreditLedger" ("id", "userId", "creationId", "kind", "amount", "balanceAfter", "idempotencyKey", "metadata")
  VALUES (p_key, p_user_id, p_creation_id, 'RESERVATION_RELEASE', v_amount, v_balance, p_key, p_metadata);
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_mirava_credit_reservation(
  p_user_id TEXT, p_creation_id TEXT, p_key TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_balance INTEGER; v_existing INTEGER;
BEGIN
  SELECT "balanceAfter" INTO v_existing FROM "StudioCreditLedger" WHERE "idempotencyKey" = p_key;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio user not found'; END IF;
  UPDATE "StudioCreditAllocation" SET "state" = 'DEBITED', "updatedAt" = NOW()
  WHERE "creationId" = p_creation_id AND "state" = 'RESERVED';
  INSERT INTO "StudioCreditLedger" ("id", "userId", "creationId", "kind", "amount", "balanceAfter", "idempotencyKey")
  VALUES (p_key, p_user_id, p_creation_id, 'ANALYSIS_DEBIT', 0, v_balance, p_key);
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollover_mirava_subscription_credits(
  p_user_id TEXT, p_lot_id TEXT, p_cap INTEGER, p_period_end TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_remaining INTEGER; v_keep INTEGER; v_expired INTEGER; v_balance INTEGER;
BEGIN
  SELECT "remaining" INTO v_remaining FROM "StudioCreditLot"
  WHERE "id" = p_lot_id AND "userId" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_keep := LEAST(v_remaining, GREATEST(0, p_cap));
  v_expired := v_remaining - v_keep;
  UPDATE "StudioCreditLot" SET "remaining" = v_keep, "expiresAt" = p_period_end, "rolloverUsedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = p_lot_id;
  IF v_expired > 0 THEN
    SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = p_user_id FOR UPDATE;
    v_balance := GREATEST(0, v_balance - v_expired);
    UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = p_user_id;
    INSERT INTO "StudioCreditLedger" ("id", "userId", "kind", "amount", "balanceAfter", "idempotencyKey", "metadata")
    VALUES ('mirava-studio-rollover-expire:' || p_lot_id, p_user_id, 'EXPIRATION', -v_expired, v_balance, 'mirava-studio-rollover-expire:' || p_lot_id, jsonb_build_object('lotId', p_lot_id, 'reason', 'rollover_cap'))
    ON CONFLICT ("idempotencyKey") DO NOTHING;
  END IF;
  RETURN v_keep;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_mirava_credit_lots() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE lot RECORD; v_balance INTEGER; v_count INTEGER := 0;
BEGIN
  FOR lot IN SELECT * FROM "StudioCreditLot" WHERE "remaining" > 0 AND "expiresAt" IS NOT NULL AND "expiresAt" <= NOW() FOR UPDATE LOOP
    SELECT "studioCredits" INTO v_balance FROM "User" WHERE "id" = lot."userId" FOR UPDATE;
    UPDATE "StudioCreditLot" SET "remaining" = 0, "updatedAt" = NOW() WHERE "id" = lot."id";
    v_balance := GREATEST(0, v_balance - lot."remaining");
    UPDATE "User" SET "studioCredits" = v_balance WHERE "id" = lot."userId";
    INSERT INTO "StudioCreditLedger" ("id", "userId", "kind", "amount", "balanceAfter", "idempotencyKey", "metadata")
    VALUES ('mirava-studio-expire:' || lot."id", lot."userId", 'EXPIRATION', -lot."remaining", v_balance, 'mirava-studio-expire:' || lot."id", jsonb_build_object('lotId', lot."id"))
    ON CONFLICT ("idempotencyKey") DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
