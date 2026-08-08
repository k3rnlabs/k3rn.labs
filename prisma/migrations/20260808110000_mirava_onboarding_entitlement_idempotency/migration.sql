ALTER TABLE "StudioSession"
ADD COLUMN "onboardingKey" TEXT;

ALTER TABLE "StudioSubscription"
ADD COLUMN "firstPaidAt" TIMESTAMP(3);

UPDATE "StudioSession" AS session
SET "onboardingKey" =
  'mirava-onboarding:v4:' || session."userId"
FROM "StudioCreation" AS creation
JOIN "User" AS account
  ON account.id = creation."userId"
WHERE creation."sessionId" = session.id
  AND creation.id = account.preferences #>> '{miravaOnboarding,firstSessionId}'
  AND session."userId" = account.id
  AND session."onboardingKey" IS NULL;

UPDATE "StudioSubscription" AS subscription
SET "firstPaidAt" = paid."firstPaidAt"
FROM (
  SELECT
    ledger."userId",
    MIN(ledger."createdAt") AS "firstPaidAt"
  FROM "StudioCreditLedger" AS ledger
  WHERE ledger.kind = 'SUBSCRIPTION_GRANT'
  GROUP BY ledger."userId"
) AS paid
WHERE paid."userId" = subscription."userId"
  AND subscription.status = 'active'
  AND subscription."firstPaidAt" IS NULL;

CREATE UNIQUE INDEX "StudioSession_onboardingKey_key"
ON "StudioSession"("onboardingKey");

CREATE UNIQUE INDEX "StudioJob_creationId_kind_key"
ON "StudioJob"("creationId", kind);

CREATE UNIQUE INDEX "StudioProfile_userId_presetId_official_key"
ON "StudioProfile"("userId", "presetId")
WHERE "sourceCreationId" IS NULL
  AND "presetId" IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_mirava_onboarding_creation(
  p_user_id TEXT,
  p_onboarding_key TEXT,
  p_studio_profile_id TEXT,
  p_identity_profile_id TEXT,
  p_preset_id TEXT,
  p_creative_options JSONB,
  p_creative_direction_summary TEXT,
  p_master_prompt TEXT,
  p_negative_prompt TEXT,
  p_consent_version TEXT
)
RETURNS TABLE("creationId" TEXT, "alreadyExisted" BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id TEXT;
  v_creation_id TEXT;
BEGIN
  IF p_onboarding_key <> 'mirava-onboarding:v4:' || p_user_id THEN
    RAISE EXCEPTION 'MIRAVA_ONBOARDING_KEY_INVALID';
  END IF;

  IF p_identity_profile_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM "StudioIdentityProfile"
    WHERE id = p_identity_profile_id
      AND "userId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'MIRAVA_ONBOARDING_IDENTITY_INVALID';
  END IF;

  IF p_studio_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "StudioProfile"
    WHERE id = p_studio_profile_id
      AND "userId" = p_user_id
  ) THEN
    RAISE EXCEPTION 'MIRAVA_ONBOARDING_PROFILE_INVALID';
  END IF;

  INSERT INTO "StudioSession" (
    id,
    "userId",
    "onboardingKey",
    "studioProfileId",
    "identityProfileId",
    "presetId",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    p_user_id,
    p_onboarding_key,
    p_studio_profile_id,
    p_identity_profile_id,
    p_preset_id,
    NOW(),
    NOW()
  )
  ON CONFLICT ("onboardingKey") DO NOTHING
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    SELECT session.id, creation.id
    INTO v_session_id, v_creation_id
    FROM "StudioSession" AS session
    JOIN "StudioCreation" AS creation
      ON creation."sessionId" = session.id
     AND creation."shotIndex" = 0
    WHERE session."onboardingKey" = p_onboarding_key
      AND session."userId" = p_user_id
      AND creation."userId" = p_user_id
    ORDER BY creation."createdAt" ASC
    LIMIT 1;

    IF v_creation_id IS NULL THEN
      RAISE EXCEPTION 'MIRAVA_ONBOARDING_PARTIAL_SESSION';
    END IF;

    RETURN QUERY
    SELECT v_creation_id, TRUE;
    RETURN;
  END IF;

  v_creation_id := gen_random_uuid()::TEXT;

  INSERT INTO "StudioCreation" (
    id,
    "userId",
    "studioProfileId",
    "identityProfileId",
    "presetId",
    "sessionId",
    "shotIndex",
    "creativeOptions",
    status,
    "creativeDirectionSummary",
    "masterPrompt",
    "negativePrompt",
    "createdAt",
    "updatedAt"
  ) VALUES (
    v_creation_id,
    p_user_id,
    p_studio_profile_id,
    p_identity_profile_id,
    p_preset_id,
    v_session_id,
    0,
    COALESCE(p_creative_options, '{}'::JSONB),
    'MASTER_PROMPT_READY',
    p_creative_direction_summary,
    p_master_prompt,
    p_negative_prompt,
    NOW(),
    NOW()
  );

  INSERT INTO "StudioConsent" (
    id,
    "creationId",
    "userId",
    version,
    "ageConfirmed",
    "rightsConfirmed",
    "privacyAccepted",
    "openaiDisclosureAccepted",
    "createdAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    v_creation_id,
    p_user_id,
    p_consent_version,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    NOW()
  );

  RETURN QUERY
  SELECT v_creation_id, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_mirava_onboarding_creation(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_mirava_onboarding_creation(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) TO service_role;
