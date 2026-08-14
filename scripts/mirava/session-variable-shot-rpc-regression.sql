\set ON_ERROR_STOP on

\echo
\echo '===== REGRESSION A — MATRIX N=1..10 ====='

DO $$
DECLARE
  n INTEGER;

  v_user_id TEXT;
  v_session_id TEXT;
  v_lot_id TEXT;

  v_shots JSONB;

  v_return_count INTEGER;
  v_return_min INTEGER;
  v_return_max INTEGER;
  v_return_distinct INTEGER;

  v_creations INTEGER;
  v_creation_min INTEGER;
  v_creation_max INTEGER;
  v_creation_distinct INTEGER;

  v_jobs INTEGER;
  v_allocations INTEGER;
  v_allocation_amount INTEGER;
  v_debited_allocations INTEGER;

  v_ledger INTEGER;
  v_reservations INTEGER;
  v_debits INTEGER;

  v_balance INTEGER;
  v_remaining INTEGER;
BEGIN
  FOR n IN 1..10 LOOP

    TRUNCATE TABLE
      "StudioCreditAllocation",
      "StudioCreditLedger",
      "StudioJob",
      "StudioCreation",
      "StudioCreditLot",
      "StudioSession",
      "User"
    CASCADE;

    v_user_id :=
      'regression-matrix-user-' || n;

    v_session_id :=
      'regression-matrix-session-' || n;

    v_lot_id :=
      'regression-matrix-lot-' || n;

    INSERT INTO "User" (
      "id",
      "studioCredits"
    )
    VALUES (
      v_user_id,
      20
    );

    INSERT INTO "StudioCreditLot" (
      "id",
      "userId",
      "kind",
      "originalAmount",
      "remaining",
      "idempotencyKey"
    )
    VALUES (
      v_lot_id,
      v_user_id,
      'MIGRATION',
      20,
      20,
      'regression-matrix-lot-key-' || n
    );

    INSERT INTO "StudioSession" (
      "id",
      "userId",
      "identityProfileId",
      "builderVersion",
      "builderConfig"
    )
    VALUES (
      v_session_id,
      v_user_id,
      'identity-test',
      1,
      jsonb_build_object(
        'mode',
        'CUSTOM_SHOOT',
        'shotCount',
        n
      )
    );

    SELECT jsonb_agg(
      jsonb_build_object(
        'shotIndex',
        g.idx,
        'shotIntent',
        'REGRESSION_' || g.idx,
        'masterPrompt',
        'REGRESSION PROMPT ' || g.idx,
        'negativePrompt',
        'REGRESSION NEGATIVE ' || g.idx
      )
      ORDER BY g.idx
    )
    INTO v_shots
    FROM generate_series(
      0,
      n - 1
    ) AS g(idx);

    SELECT
      count(*),
      min(result."shotIndex"),
      max(result."shotIndex"),
      count(
        DISTINCT result."shotIndex"
      )
    INTO
      v_return_count,
      v_return_min,
      v_return_max,
      v_return_distinct
    FROM public.launch_mirava_session_shoot(
      v_user_id,
      v_session_id,
      v_shots
    ) AS result;

    IF
      v_return_count <> n
      OR v_return_min <> 0
      OR v_return_max <> n - 1
      OR v_return_distinct <> n
    THEN
      RAISE EXCEPTION
        'MATRIX_RPC_FAILED N=% count=% min=% max=% distinct=%',
        n,
        v_return_count,
        v_return_min,
        v_return_max,
        v_return_distinct;
    END IF;

    SELECT
      count(*),
      min("shotIndex"),
      max("shotIndex"),
      count(
        DISTINCT "shotIndex"
      )
    INTO
      v_creations,
      v_creation_min,
      v_creation_max,
      v_creation_distinct
    FROM "StudioCreation"
    WHERE
      "sessionId" = v_session_id
      AND "parentCreationId" IS NULL;

    IF
      v_creations <> n
      OR v_creation_min <> 0
      OR v_creation_max <> n - 1
      OR v_creation_distinct <> n
    THEN
      RAISE EXCEPTION
        'MATRIX_CREATIONS_FAILED N=% count=% min=% max=% distinct=%',
        n,
        v_creations,
        v_creation_min,
        v_creation_max,
        v_creation_distinct;
    END IF;

    SELECT count(*)
    INTO v_jobs
    FROM "StudioJob"
    WHERE
      "kind" = 'GENERATE'
      AND "status" = 'PENDING';

    IF v_jobs <> n THEN
      RAISE EXCEPTION
        'MATRIX_JOBS_FAILED N=% jobs=%',
        n,
        v_jobs;
    END IF;

    SELECT
      count(*),
      COALESCE(
        sum("amount"),
        0
      ),
      count(*) FILTER (
        WHERE "state" = 'DEBITED'
      )
    INTO
      v_allocations,
      v_allocation_amount,
      v_debited_allocations
    FROM "StudioCreditAllocation";

    IF
      v_allocations <> n
      OR v_allocation_amount <> n
      OR v_debited_allocations <> n
    THEN
      RAISE EXCEPTION
        'MATRIX_ALLOCATIONS_FAILED N=% count=% amount=% debited=%',
        n,
        v_allocations,
        v_allocation_amount,
        v_debited_allocations;
    END IF;

    SELECT count(*)
    INTO v_ledger
    FROM "StudioCreditLedger";

    SELECT count(*)
    INTO v_reservations
    FROM "StudioCreditLedger"
    WHERE
      "kind" = 'RESERVATION'
      AND "amount" = -1;

    SELECT count(*)
    INTO v_debits
    FROM "StudioCreditLedger"
    WHERE
      "kind" = 'ANALYSIS_DEBIT'
      AND "amount" = 0;

    IF
      v_ledger <> n * 2
      OR v_reservations <> n
      OR v_debits <> n
    THEN
      RAISE EXCEPTION
        'MATRIX_LEDGER_FAILED N=% total=% reservations=% debits=%',
        n,
        v_ledger,
        v_reservations,
        v_debits;
    END IF;

    SELECT "studioCredits"
    INTO v_balance
    FROM "User"
    WHERE "id" = v_user_id;

    SELECT "remaining"
    INTO v_remaining
    FROM "StudioCreditLot"
    WHERE "id" = v_lot_id;

    IF
      v_balance <> 20 - n
      OR v_remaining <> 20 - n
    THEN
      RAISE EXCEPTION
        'MATRIX_CREDIT_FAILED N=% balance=% remaining=%',
        n,
        v_balance,
        v_remaining;
    END IF;

    RAISE NOTICE
      'REGRESSION_MATRIX_N=% PASS',
      n;

  END LOOP;

  RAISE NOTICE
    'REGRESSION_MATRIX_1_TO_10_ALL_PASS';
END
$$;


\echo
\echo '===== REGRESSION B — SEQUENTIAL IDEMPOTENCE ====='

DO $$
DECLARE
  v_before_ids TEXT[];
  v_after_ids TEXT[];

  v_return_count INTEGER;

  v_before_creations INTEGER;
  v_before_jobs INTEGER;
  v_before_allocations INTEGER;
  v_before_ledger INTEGER;
  v_before_balance INTEGER;
  v_before_remaining INTEGER;

  v_after_creations INTEGER;
  v_after_jobs INTEGER;
  v_after_allocations INTEGER;
  v_after_ledger INTEGER;
  v_after_balance INTEGER;
  v_after_remaining INTEGER;

  v_shots JSONB;
BEGIN
  /*
   * Matrix test leaves the N=10 state in place.
   */
  SELECT array_agg(
    "id"
    ORDER BY "shotIndex"
  )
  INTO v_before_ids
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-matrix-session-10'
    AND "parentCreationId" IS NULL;

  SELECT count(*)
  INTO v_before_creations
  FROM "StudioCreation";

  SELECT count(*)
  INTO v_before_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_before_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_before_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_before_balance
  FROM "User"
  WHERE
    "id" = 'regression-matrix-user-10';

  SELECT "remaining"
  INTO v_before_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-matrix-lot-10';

  SELECT jsonb_agg(
    jsonb_build_object(
      'shotIndex',
      g.idx,
      'shotIntent',
      'RETRY_' || g.idx,
      'masterPrompt',
      'RETRY PROMPT ' || g.idx,
      'negativePrompt',
      'RETRY NEGATIVE ' || g.idx
    )
    ORDER BY g.idx
  )
  INTO v_shots
  FROM generate_series(
    0,
    9
  ) AS g(idx);

  SELECT count(*)
  INTO v_return_count
  FROM public.launch_mirava_session_shoot(
    'regression-matrix-user-10',
    'regression-matrix-session-10',
    v_shots
  );

  IF v_return_count <> 10 THEN
    RAISE EXCEPTION
      'IDEMPOTENCE_RETURN_COUNT_FAILED count=%',
      v_return_count;
  END IF;

  SELECT array_agg(
    "id"
    ORDER BY "shotIndex"
  )
  INTO v_after_ids
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-matrix-session-10'
    AND "parentCreationId" IS NULL;

  SELECT count(*)
  INTO v_after_creations
  FROM "StudioCreation";

  SELECT count(*)
  INTO v_after_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_after_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_after_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_after_balance
  FROM "User"
  WHERE
    "id" = 'regression-matrix-user-10';

  SELECT "remaining"
  INTO v_after_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-matrix-lot-10';

  IF v_before_ids IS DISTINCT FROM v_after_ids THEN
    RAISE EXCEPTION
      'IDEMPOTENCE_CREATION_IDS_CHANGED';
  END IF;

  IF
    v_before_creations <> v_after_creations
    OR v_before_jobs <> v_after_jobs
    OR v_before_allocations <> v_after_allocations
    OR v_before_ledger <> v_after_ledger
    OR v_before_balance <> v_after_balance
    OR v_before_remaining <> v_after_remaining
  THEN
    RAISE EXCEPTION
      'IDEMPOTENCE_STATE_MUTATED';
  END IF;

  IF
    v_after_creations <> 10
    OR v_after_jobs <> 10
    OR v_after_allocations <> 10
    OR v_after_ledger <> 20
    OR v_after_balance <> 10
    OR v_after_remaining <> 10
  THEN
    RAISE EXCEPTION
      'IDEMPOTENCE_FINAL_STATE_INVALID';
  END IF;

  RAISE NOTICE
    'REGRESSION_SEQUENTIAL_IDEMPOTENCE_PASS';
END
$$;


\echo
\echo '===== REGRESSION C — INSUFFICIENT CREDIT ROLLBACK ====='

TRUNCATE TABLE
  "StudioCreditAllocation",
  "StudioCreditLedger",
  "StudioJob",
  "StudioCreation",
  "StudioCreditLot",
  "StudioSession",
  "User"
CASCADE;

INSERT INTO "User" (
  "id",
  "studioCredits"
)
VALUES (
  'regression-insufficient-user',
  5
);

INSERT INTO "StudioCreditLot" (
  "id",
  "userId",
  "kind",
  "originalAmount",
  "remaining",
  "idempotencyKey"
)
VALUES (
  'regression-insufficient-lot',
  'regression-insufficient-user',
  'MIGRATION',
  5,
  5,
  'regression-insufficient-lot-key'
);

INSERT INTO "StudioSession" (
  "id",
  "userId",
  "identityProfileId",
  "builderVersion",
  "builderConfig"
)
VALUES (
  'regression-insufficient-session',
  'regression-insufficient-user',
  'identity-test',
  1,
  '{"mode":"CUSTOM_SHOOT","shotCount":10}'::jsonb
);

DO $$
DECLARE
  v_expected_error BOOLEAN := false;

  v_creations INTEGER;
  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;

  v_shots JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'shotIndex',
      g.idx,
      'shotIntent',
      'ROLLBACK_' || g.idx,
      'masterPrompt',
      'ROLLBACK PROMPT ' || g.idx,
      'negativePrompt',
      'ROLLBACK NEGATIVE ' || g.idx
    )
    ORDER BY g.idx
  )
  INTO v_shots
  FROM generate_series(
    0,
    9
  ) AS g(idx);

  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-insufficient-user',
      'regression-insufficient-session',
      v_shots
    );

  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'INSUFFICIENT_STUDIO_CREDITS'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'INSUFFICIENT_CREDIT_WAS_ACCEPTED';
  END IF;

  SELECT count(*)
  INTO v_creations
  FROM "StudioCreation";

  SELECT count(*)
  INTO v_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE
    "id" = 'regression-insufficient-user';

  SELECT "remaining"
  INTO v_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-insufficient-lot';

  IF
    v_creations <> 0
    OR v_jobs <> 0
    OR v_allocations <> 0
    OR v_ledger <> 0
    OR v_balance <> 5
    OR v_remaining <> 5
  THEN
    RAISE EXCEPTION
      'INSUFFICIENT_CREDIT_ROLLBACK_FAILED creations=% jobs=% allocations=% ledger=% balance=% remaining=%',
      v_creations,
      v_jobs,
      v_allocations,
      v_ledger,
      v_balance,
      v_remaining;
  END IF;

  RAISE NOTICE
    'REGRESSION_INSUFFICIENT_CREDIT_ROLLBACK_PASS';
END
$$;


\echo
\echo '===== REGRESSION D — INVALID SHOT COUNTS ====='

DO $$
DECLARE
  n INTEGER;

  v_expected_error BOOLEAN;

  v_creations INTEGER;
  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;
BEGIN
  FOREACH n IN ARRAY ARRAY[0, 11]
  LOOP
    TRUNCATE TABLE
      "StudioCreditAllocation",
      "StudioCreditLedger",
      "StudioJob",
      "StudioCreation",
      "StudioCreditLot",
      "StudioSession",
      "User"
    CASCADE;

    INSERT INTO "User" (
      "id",
      "studioCredits"
    )
    VALUES (
      'regression-invalid-user-' || n,
      20
    );

    INSERT INTO "StudioCreditLot" (
      "id",
      "userId",
      "kind",
      "originalAmount",
      "remaining",
      "idempotencyKey"
    )
    VALUES (
      'regression-invalid-lot-' || n,
      'regression-invalid-user-' || n,
      'MIGRATION',
      20,
      20,
      'regression-invalid-lot-key-' || n
    );

    INSERT INTO "StudioSession" (
      "id",
      "userId",
      "identityProfileId",
      "builderVersion",
      "builderConfig"
    )
    VALUES (
      'regression-invalid-session-' || n,
      'regression-invalid-user-' || n,
      'identity-test',
      1,
      jsonb_build_object(
        'mode',
        'CUSTOM_SHOOT',
        'shotCount',
        n
      )
    );

    v_expected_error := false;

    BEGIN
      PERFORM *
      FROM public.launch_mirava_session_shoot(
        'regression-invalid-user-' || n,
        'regression-invalid-session-' || n,
        '[]'::jsonb
      );

    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM <>
          'MIRAVA_SESSION_INVALID_SHOT_COUNT'
        THEN
          RAISE;
        END IF;

        v_expected_error := true;
    END;

    IF NOT v_expected_error THEN
      RAISE EXCEPTION
        'INVALID_SHOT_COUNT_ACCEPTED N=%',
        n;
    END IF;

    SELECT count(*)
    INTO v_creations
    FROM "StudioCreation";

    SELECT count(*)
    INTO v_jobs
    FROM "StudioJob";

    SELECT count(*)
    INTO v_allocations
    FROM "StudioCreditAllocation";

    SELECT count(*)
    INTO v_ledger
    FROM "StudioCreditLedger";

    SELECT "studioCredits"
    INTO v_balance
    FROM "User"
    WHERE
      "id" =
        'regression-invalid-user-' || n;

    SELECT "remaining"
    INTO v_remaining
    FROM "StudioCreditLot"
    WHERE
      "id" =
        'regression-invalid-lot-' || n;

    IF
      v_creations <> 0
      OR v_jobs <> 0
      OR v_allocations <> 0
      OR v_ledger <> 0
      OR v_balance <> 20
      OR v_remaining <> 20
    THEN
      RAISE EXCEPTION
        'INVALID_SHOT_COUNT_MUTATED_STATE N=%',
        n;
    END IF;

    RAISE NOTICE
      'REGRESSION_INVALID_SHOT_COUNT_N=% PASS',
      n;

  END LOOP;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOT_COUNTS_ALL_PASS';
END
$$;


\echo
\echo '===== REGRESSION E — INVALID p_shots PAYLOADS ====='

TRUNCATE TABLE
  "StudioCreditAllocation",
  "StudioCreditLedger",
  "StudioJob",
  "StudioCreation",
  "StudioCreditLot",
  "StudioSession",
  "User"
CASCADE;

INSERT INTO "User" (
  "id",
  "studioCredits"
)
VALUES (
  'regression-invalid-shots-user',
  20
);

INSERT INTO "StudioCreditLot" (
  "id",
  "userId",
  "kind",
  "originalAmount",
  "remaining",
  "idempotencyKey"
)
VALUES (
  'regression-invalid-shots-lot',
  'regression-invalid-shots-user',
  'MIGRATION',
  20,
  20,
  'regression-invalid-shots-lot-key'
);

INSERT INTO "StudioSession" (
  "id",
  "userId",
  "identityProfileId",
  "builderVersion",
  "builderConfig"
)
VALUES (
  'regression-invalid-shots-session',
  'regression-invalid-shots-user',
  'identity-test',
  1,
  '{"mode":"CUSTOM_SHOOT","shotCount":3}'::jsonb
);

DO $$
DECLARE
  v_expected_error BOOLEAN;

  v_creations INTEGER;
  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;
BEGIN

  /*
   * Wrong array length.
   */
  v_expected_error := false;

  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-invalid-shots-user',
      'regression-invalid-shots-session',
      '[
        {
          "shotIndex": 0,
          "shotIntent": "A",
          "masterPrompt": "A"
        },
        {
          "shotIndex": 1,
          "shotIntent": "B",
          "masterPrompt": "B"
        }
      ]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'MIRAVA_SESSION_INVALID_SHOTS'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'INVALID_SHOTS_LENGTH_ACCEPTED';
  END IF;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOTS_LENGTH_PASS';


  /*
   * Duplicate canonical index.
   */
  v_expected_error := false;

  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-invalid-shots-user',
      'regression-invalid-shots-session',
      '[
        {
          "shotIndex": 0,
          "shotIntent": "A",
          "masterPrompt": "A"
        },
        {
          "shotIndex": 0,
          "shotIntent": "B",
          "masterPrompt": "B"
        },
        {
          "shotIndex": 2,
          "shotIntent": "C",
          "masterPrompt": "C"
        }
      ]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'MIRAVA_SESSION_INVALID_SHOTS'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'INVALID_SHOTS_DUPLICATE_ACCEPTED';
  END IF;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOTS_DUPLICATE_PASS';


  /*
   * Correct values but wrong canonical order.
   */
  v_expected_error := false;

  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-invalid-shots-user',
      'regression-invalid-shots-session',
      '[
        {
          "shotIndex": 0,
          "shotIntent": "A",
          "masterPrompt": "A"
        },
        {
          "shotIndex": 2,
          "shotIntent": "B",
          "masterPrompt": "B"
        },
        {
          "shotIndex": 1,
          "shotIntent": "C",
          "masterPrompt": "C"
        }
      ]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'MIRAVA_SESSION_INVALID_SHOTS'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'INVALID_SHOTS_ORDER_ACCEPTED';
  END IF;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOTS_ORDER_PASS';


  /*
   * Non-numeric canonical index.
   */
  v_expected_error := false;

  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-invalid-shots-user',
      'regression-invalid-shots-session',
      '[
        {
          "shotIndex": 0,
          "shotIntent": "A",
          "masterPrompt": "A"
        },
        {
          "shotIndex": "x",
          "shotIntent": "B",
          "masterPrompt": "B"
        },
        {
          "shotIndex": 2,
          "shotIntent": "C",
          "masterPrompt": "C"
        }
      ]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'MIRAVA_SESSION_INVALID_SHOTS'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'INVALID_SHOTS_NON_NUMERIC_ACCEPTED';
  END IF;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOTS_NON_NUMERIC_PASS';


  /*
   * Every rejected payload must leave the
   * launch state completely untouched.
   */
  SELECT count(*)
  INTO v_creations
  FROM "StudioCreation";

  SELECT count(*)
  INTO v_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE
    "id" = 'regression-invalid-shots-user';

  SELECT "remaining"
  INTO v_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-invalid-shots-lot';

  IF
    v_creations <> 0
    OR v_jobs <> 0
    OR v_allocations <> 0
    OR v_ledger <> 0
    OR v_balance <> 20
    OR v_remaining <> 20
  THEN
    RAISE EXCEPTION
      'INVALID_SHOTS_MUTATED_STATE creations=% jobs=% allocations=% ledger=% balance=% remaining=%',
      v_creations,
      v_jobs,
      v_allocations,
      v_ledger,
      v_balance,
      v_remaining;
  END IF;

  RAISE NOTICE
    'REGRESSION_INVALID_SHOTS_ALL_PASS';
END
$$;


\echo
\echo '===== REGRESSION F — PARTIAL CANONICAL RUN ====='

TRUNCATE TABLE
  "StudioCreditAllocation",
  "StudioCreditLedger",
  "StudioJob",
  "StudioCreation",
  "StudioCreditLot",
  "StudioSession",
  "User"
CASCADE;

INSERT INTO "User" (
  "id",
  "studioCredits"
)
VALUES (
  'regression-partial-user',
  20
);

INSERT INTO "StudioCreditLot" (
  "id",
  "userId",
  "kind",
  "originalAmount",
  "remaining",
  "idempotencyKey"
)
VALUES (
  'regression-partial-lot',
  'regression-partial-user',
  'MIGRATION',
  20,
  20,
  'regression-partial-lot-key'
);

INSERT INTO "StudioSession" (
  "id",
  "userId",
  "identityProfileId",
  "builderVersion",
  "builderConfig"
)
VALUES (
  'regression-partial-session',
  'regression-partial-user',
  'identity-test',
  1,
  '{"mode":"CUSTOM_SHOOT","shotCount":3}'::jsonb
);

INSERT INTO "StudioCreation" (
  "id",
  "userId",
  "sessionId",
  "shotIndex",
  "status"
)
VALUES
  (
    'regression-partial-creation-0',
    'regression-partial-user',
    'regression-partial-session',
    0,
    'GENERATION_QUEUED'
  ),
  (
    'regression-partial-creation-1',
    'regression-partial-user',
    'regression-partial-session',
    1,
    'GENERATION_QUEUED'
  );

DO $$
DECLARE
  v_expected_error BOOLEAN := false;

  v_creations INTEGER;
  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;
BEGIN
  BEGIN
    PERFORM *
    FROM public.launch_mirava_session_shoot(
      'regression-partial-user',
      'regression-partial-session',
      '[
        {
          "shotIndex": 0,
          "shotIntent": "A",
          "masterPrompt": "A"
        },
        {
          "shotIndex": 1,
          "shotIntent": "B",
          "masterPrompt": "B"
        },
        {
          "shotIndex": 2,
          "shotIntent": "C",
          "masterPrompt": "C"
        }
      ]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <>
        'MIRAVA_SESSION_PARTIAL_RUN'
      THEN
        RAISE;
      END IF;

      v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION
      'PARTIAL_RUN_WAS_ACCEPTED';
  END IF;

  SELECT count(*)
  INTO v_creations
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-partial-session'
    AND "parentCreationId" IS NULL;

  SELECT count(*)
  INTO v_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE
    "id" = 'regression-partial-user';

  SELECT "remaining"
  INTO v_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-partial-lot';

  IF
    v_creations <> 2
    OR v_jobs <> 0
    OR v_allocations <> 0
    OR v_ledger <> 0
    OR v_balance <> 20
    OR v_remaining <> 20
  THEN
    RAISE EXCEPTION
      'PARTIAL_RUN_MUTATED_STATE creations=% jobs=% allocations=% ledger=% balance=% remaining=%',
      v_creations,
      v_jobs,
      v_allocations,
      v_ledger,
      v_balance,
      v_remaining;
  END IF;

  RAISE NOTICE
    'REGRESSION_PARTIAL_RUN_REJECTED_PASS';
END
$$;


\echo
\echo '===== REGRESSION G — CONTINUATION EXCLUSION ====='

TRUNCATE TABLE
  "StudioCreditAllocation",
  "StudioCreditLedger",
  "StudioJob",
  "StudioCreation",
  "StudioCreditLot",
  "StudioSession",
  "User"
CASCADE;

INSERT INTO "User" (
  "id",
  "studioCredits"
)
VALUES (
  'regression-continuation-user',
  20
);

INSERT INTO "StudioCreditLot" (
  "id",
  "userId",
  "kind",
  "originalAmount",
  "remaining",
  "idempotencyKey"
)
VALUES (
  'regression-continuation-lot',
  'regression-continuation-user',
  'MIGRATION',
  20,
  20,
  'regression-continuation-lot-key'
);

INSERT INTO "StudioSession" (
  "id",
  "userId",
  "identityProfileId",
  "builderVersion",
  "builderConfig"
)
VALUES (
  'regression-continuation-session',
  'regression-continuation-user',
  'identity-test',
  1,
  '{"mode":"CUSTOM_SHOOT","shotCount":3}'::jsonb
);

DO $$
DECLARE
  v_shots JSONB;

  v_parent_id TEXT;
  v_before_ids TEXT[];
  v_retry_ids TEXT[];

  v_total_creations INTEGER;
  v_canonical_creations INTEGER;
  v_continuations INTEGER;

  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;
BEGIN
  v_shots :=
    '[
      {
        "shotIndex": 0,
        "shotIntent": "A",
        "masterPrompt": "A"
      },
      {
        "shotIndex": 1,
        "shotIntent": "B",
        "masterPrompt": "B"
      },
      {
        "shotIndex": 2,
        "shotIntent": "C",
        "masterPrompt": "C"
      }
    ]'::jsonb;

  /*
   * Create the real 3 canonical shots.
   */
  PERFORM *
  FROM public.launch_mirava_session_shoot(
    'regression-continuation-user',
    'regression-continuation-session',
    v_shots
  );

  SELECT
    "id"
  INTO v_parent_id
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-continuation-session'
    AND "parentCreationId" IS NULL
    AND "shotIndex" = 0;

  SELECT array_agg(
    "id"
    ORDER BY "shotIndex"
  )
  INTO v_before_ids
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-continuation-session'
    AND "parentCreationId" IS NULL;

  /*
   * A continuation shares sessionId but is not
   * a canonical Builder slot.
   *
   * shotIndex 3 avoids the canonical unique slots
   * 0,1,2 while preserving the real session relation.
   */
  INSERT INTO "StudioCreation" (
    "id",
    "userId",
    "sessionId",
    "parentCreationId",
    "shotIndex",
    "status"
  )
  VALUES (
    'regression-continuation-child',
    'regression-continuation-user',
    'regression-continuation-session',
    v_parent_id,
    3,
    'GENERATION_QUEUED'
  );

  /*
   * Retry launch: the continuation must not turn
   * canonical count 3 into count 4 / partial run.
   */
  SELECT array_agg(
    result."creationId"
    ORDER BY result."shotIndex"
  )
  INTO v_retry_ids
  FROM public.launch_mirava_session_shoot(
    'regression-continuation-user',
    'regression-continuation-session',
    v_shots
  ) AS result;

  IF v_before_ids IS DISTINCT FROM v_retry_ids THEN
    RAISE EXCEPTION
      'CONTINUATION_CHANGED_CANONICAL_RETRY_RESULT';
  END IF;

  SELECT count(*)
  INTO v_total_creations
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-continuation-session';

  SELECT count(*)
  INTO v_canonical_creations
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-continuation-session'
    AND "parentCreationId" IS NULL;

  SELECT count(*)
  INTO v_continuations
  FROM "StudioCreation"
  WHERE
    "sessionId" = 'regression-continuation-session'
    AND "parentCreationId" IS NOT NULL;

  SELECT count(*)
  INTO v_jobs
  FROM "StudioJob";

  SELECT count(*)
  INTO v_allocations
  FROM "StudioCreditAllocation";

  SELECT count(*)
  INTO v_ledger
  FROM "StudioCreditLedger";

  SELECT "studioCredits"
  INTO v_balance
  FROM "User"
  WHERE
    "id" = 'regression-continuation-user';

  SELECT "remaining"
  INTO v_remaining
  FROM "StudioCreditLot"
  WHERE
    "id" = 'regression-continuation-lot';

  IF
    v_total_creations <> 4
    OR v_canonical_creations <> 3
    OR v_continuations <> 1
    OR v_jobs <> 3
    OR v_allocations <> 3
    OR v_ledger <> 6
    OR v_balance <> 17
    OR v_remaining <> 17
  THEN
    RAISE EXCEPTION
      'CONTINUATION_EXCLUSION_FAILED total=% canonical=% continuations=% jobs=% allocations=% ledger=% balance=% remaining=%',
      v_total_creations,
      v_canonical_creations,
      v_continuations,
      v_jobs,
      v_allocations,
      v_ledger,
      v_balance,
      v_remaining;
  END IF;

  RAISE NOTICE
    'REGRESSION_CONTINUATION_EXCLUSION_PASS';
END
$$;


\echo
\echo '===== FUNCTIONAL REGRESSION PASS ====='
\echo 'SESSION_VARIABLE_SHOT_RPC_FUNCTIONAL_REGRESSION=PASS'
