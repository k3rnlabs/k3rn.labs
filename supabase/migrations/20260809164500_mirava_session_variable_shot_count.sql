-- MIRAVA Session Builder variable shot count.
--
-- This replaces only the current definition of the RPC.
-- Historical migrations remain immutable.
--
-- Supported persisted counts:
--   every integer from 1 through 10.
-- Sessions without a usable persisted shotCount
-- retain the legacy six-shot fallback.
--
-- Credit semantics remain unchanged:
-- exactly one reservation + one debit per canonical shot.

CREATE OR REPLACE FUNCTION public.launch_mirava_session_shoot(
  p_user_id TEXT,
  p_session_id TEXT,
  p_shots JSONB
)
RETURNS TABLE(
  "creationId" TEXT,
  "shotIndex" INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_shot JSONB;
  v_creation_id TEXT;
  v_index INTEGER;
  v_count INTEGER;
  v_expected_count INTEGER := 6;
BEGIN
  SELECT *
  INTO v_session
  FROM "StudioSession"
  WHERE
    "id" = p_session_id
    AND "userId" = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'MIRAVA_SESSION_NOT_FOUND';
  END IF;

  /*
   * Legacy compatibility:
   * sessions without a usable persisted shotCount
   * retain the original six-shot contract.
   */
  IF
    v_session."builderConfig" IS NOT NULL
    AND jsonb_typeof(
      v_session."builderConfig"
    ) = 'object'
    AND COALESCE(
      v_session."builderConfig"->>'shotCount',
      ''
    ) ~ '^[0-9]+$'
  THEN
    v_expected_count :=
      (
        v_session."builderConfig"
        ->>'shotCount'
      )::INTEGER;
  END IF;

  IF
    v_expected_count < 1
    OR v_expected_count > 10
  THEN
    RAISE EXCEPTION
      'MIRAVA_SESSION_INVALID_SHOT_COUNT';
  END IF;

  /*
   * Continuations share sessionId for lineage but are
   * not canonical Builder slots.
   */
  SELECT count(*)
  INTO v_count
  FROM "StudioCreation"
  WHERE
    "sessionId" = p_session_id
    AND "parentCreationId" IS NULL;

  IF v_count > 0 THEN
    IF
      v_count <> v_expected_count
    THEN
      RAISE EXCEPTION
        'MIRAVA_SESSION_PARTIAL_RUN';
    END IF;

    RETURN QUERY
    SELECT
      creation."id",
      creation."shotIndex"
    FROM "StudioCreation" AS creation
    WHERE
      creation."sessionId" =
        p_session_id
      AND creation."parentCreationId"
        IS NULL
    ORDER BY
      creation."shotIndex";

    RETURN;
  END IF;

  IF
    jsonb_typeof(p_shots) <> 'array'
    OR jsonb_array_length(p_shots)
      <> v_expected_count
  THEN
    RAISE EXCEPTION
      'MIRAVA_SESSION_INVALID_SHOTS';
  END IF;

  /*
   * Require an exact ordered canonical sequence
   * 0..N-1. This prevents duplicate, missing or
   * client-invented slot indexes at the DB boundary.
   */
  IF EXISTS (
    SELECT 1
    FROM
      jsonb_array_elements(
        p_shots
      )
      WITH ORDINALITY
      AS shot(
        value,
        ordinal
      )
    WHERE
      CASE
        WHEN
          COALESCE(
            shot.value->>'shotIndex',
            ''
          ) ~ '^[0-9]+$'
        THEN
          (
            shot.value->>'shotIndex'
          )::INTEGER
          <>
          (
            shot.ordinal - 1
          )::INTEGER
        ELSE
          TRUE
      END
  )
  THEN
    RAISE EXCEPTION
      'MIRAVA_SESSION_INVALID_SHOTS';
  END IF;

  FOR v_shot IN
    SELECT value
    FROM jsonb_array_elements(
      p_shots
    )
  LOOP
    v_index :=
      (
        v_shot->>'shotIndex'
      )::INTEGER;

    v_creation_id :=
      gen_random_uuid()::TEXT;

    INSERT INTO "StudioCreation" (
      "id",
      "userId",
      "identityProfileId",
      "sessionId",
      "shotIndex",
      "shotIntent",
      "creativeOptions",
      "status",
      "masterPrompt",
      "negativePrompt",
      "creditReservationKey",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      v_creation_id,
      p_user_id,
      v_session."identityProfileId",
      p_session_id,
      v_index,
      v_shot->>'shotIntent',
      '{"seriesSize":1}'::jsonb,
      'GENERATION_QUEUED',
      v_shot->>'masterPrompt',
      v_shot->>'negativePrompt',
      'mirava-session-reservation:'
        || p_session_id
        || ':'
        || v_index,
      NOW(),
      NOW()
    );

    PERFORM public.reserve_mirava_credit(
      p_user_id,
      v_creation_id,
      'mirava-session-reservation:'
        || p_session_id
        || ':'
        || v_index,
      1
    );

    PERFORM public.debit_mirava_credit_reservation(
      p_user_id,
      v_creation_id,
      'mirava-session-debit:'
        || p_session_id
        || ':'
        || v_index
    );

    INSERT INTO "StudioJob" (
      "id",
      "creationId",
      "kind",
      "status",
      "attempts",
      "nextRunAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid()::TEXT,
      v_creation_id,
      'GENERATE',
      'PENDING',
      0,
      NOW(),
      NOW(),
      NOW()
    );
  END LOOP;

  RETURN QUERY
  SELECT
    creation."id",
    creation."shotIndex"
  FROM "StudioCreation" AS creation
  WHERE
    creation."sessionId" =
      p_session_id
    AND creation."parentCreationId"
      IS NULL
  ORDER BY
    creation."shotIndex";
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.launch_mirava_session_shoot(
    TEXT,
    TEXT,
    JSONB
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.launch_mirava_session_shoot(
    TEXT,
    TEXT,
    JSONB
  )
TO service_role;
