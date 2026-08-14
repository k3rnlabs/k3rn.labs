#!/usr/bin/env bash

set -euo pipefail

ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$ROOT"

CONTAINER="mirava-session-rpc-regression-$$"
IMAGE="${MIRAVA_TEST_POSTGRES_IMAGE:-postgres:16-alpine}"

DB="mirava_rpc_regression"
DB_USER="mirava_test"
DB_PASSWORD="mirava_test"

cleanup() {
  docker rm -f "$CONTAINER" \
    >/dev/null 2>&1 \
    || true

  if [[ -n "${RUN_TMP_DIR:-}" ]]; then
    rm -rf "$RUN_TMP_DIR"
  fi
}

trap cleanup EXIT INT TERM

echo "===== MIRAVA SESSION RPC POSTGRES REGRESSION ====="
echo "ROOT=$ROOT"
echo "CONTAINER=$CONTAINER"
echo "IMAGE=$IMAGE"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon unavailable"
  exit 10
fi

if [[ ! -f \
  "supabase/migrations/20260809164500_mirava_session_variable_shot_count.sql" \
]]; then
  echo "ERROR: variable-shot Supabase migration missing"
  exit 11
fi

if [[ ! -f \
  "prisma/migrations/20260809164500_mirava_session_variable_shot_count/migration.sql" \
]]; then
  echo "ERROR: variable-shot Prisma migration missing"
  exit 12
fi

PRISMA_HASH="$(
  shasum \
    prisma/migrations/20260809164500_mirava_session_variable_shot_count/migration.sql \
  | awk '{print $1}'
)"

SUPABASE_HASH="$(
  shasum \
    supabase/migrations/20260809164500_mirava_session_variable_shot_count.sql \
  | awk '{print $1}'
)"

echo "PRISMA_HASH=$PRISMA_HASH"
echo "SUPABASE_HASH=$SUPABASE_HASH"

if [[ "$PRISMA_HASH" != "$SUPABASE_HASH" ]]; then
  echo "ERROR: Prisma/Supabase migration mirrors diverged"
  exit 13
fi

echo
echo "===== START DISPOSABLE POSTGRES ====="

docker run \
  --name "$CONTAINER" \
  --detach \
  --env POSTGRES_USER="$DB_USER" \
  --env POSTGRES_PASSWORD="$DB_PASSWORD" \
  --env POSTGRES_DB="$DB" \
  "$IMAGE" \
  >/dev/null

READY=0

for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" \
    pg_isready \
      -U "$DB_USER" \
      -d "$DB" \
      >/dev/null 2>&1
  then
    READY=1
    break
  fi

  sleep 1
done

if [[ "$READY" != "1" ]]; then
  echo "ERROR: disposable PostgreSQL did not become ready"
  exit 14
fi

echo "POSTGRES_READY=TRUE"

TABLE_COUNT="$(
  docker exec "$CONTAINER" \
    psql \
      -U "$DB_USER" \
      -d "$DB" \
      -Atc "
        SELECT count(*)
        FROM pg_tables
        WHERE schemaname='public';
      "
)"

echo "INITIAL_PUBLIC_TABLE_COUNT=$TABLE_COUNT"

if [[ "$TABLE_COUNT" != "0" ]]; then
  echo "ERROR: disposable PostgreSQL is not empty"
  exit 15
fi

BOOTSTRAP_SQL="$ROOT/scripts/mirava/session-variable-shot-rpc-bootstrap.sql"
RPC_MIGRATION="$ROOT/supabase/migrations/20260809164500_mirava_session_variable_shot_count.sql"

if [[ ! -f "$BOOTSTRAP_SQL" ]]; then
  echo "ERROR: PostgreSQL bootstrap fixture missing"
  exit 16
fi

echo
echo "===== APPLY VALIDATED LOCAL BOOTSTRAP ====="

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
  < "$BOOTSTRAP_SQL"

echo
echo "===== APPLY REAL VARIABLE-SHOT RPC MIGRATION ====="

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
  < "$RPC_MIGRATION"

echo
echo "===== VERIFY BOOTSTRAP CONTRACT ====="

FINAL_TABLE_COUNT="$(
  docker exec "$CONTAINER" \
    psql \
      -U "$DB_USER" \
      -d "$DB" \
      -Atc "
        SELECT count(*)
        FROM pg_tables
        WHERE schemaname='public';
      "
)"

TARGET_FUNCTION_COUNT="$(
  docker exec "$CONTAINER" \
    psql \
      -U "$DB_USER" \
      -d "$DB" \
      -Atc "
        SELECT count(*)
        FROM pg_proc AS p
        JOIN pg_namespace AS n
          ON n.oid = p.pronamespace
        WHERE
          n.nspname = 'public'
          AND p.proname IN (
            'reserve_mirava_credit',
            'debit_mirava_credit_reservation',
            'launch_mirava_session_shoot'
          );
      "
)"

echo "FINAL_PUBLIC_TABLE_COUNT=$FINAL_TABLE_COUNT"
echo "TARGET_FUNCTION_COUNT=$TARGET_FUNCTION_COUNT"

if [[ "$FINAL_TABLE_COUNT" != "7" ]]; then
  echo "ERROR: expected exactly 7 bootstrap tables"
  exit 17
fi

if [[ "$TARGET_FUNCTION_COUNT" != "3" ]]; then
  echo "ERROR: expected exactly 3 target functions"
  exit 18
fi

REGRESSION_SQL="$ROOT/scripts/mirava/session-variable-shot-rpc-regression.sql"

if [[ ! -f "$REGRESSION_SQL" ]]; then
  echo "ERROR: functional regression SQL missing"
  exit 19
fi

echo
echo "===== RUN FUNCTIONAL REGRESSION ====="

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
  < "$REGRESSION_SQL"

echo
echo "===== RUN CONCURRENT IDEMPOTENCE REGRESSION ====="

RUN_TMP_DIR="$(
  mktemp -d \
    "${TMPDIR:-/tmp}/mirava-session-rpc-concurrency.XXXXXX"
)"

CALL_A_SQL="$RUN_TMP_DIR/call-a.sql"
CALL_B_SQL="$RUN_TMP_DIR/call-b.sql"
OUT_A="$RUN_TMP_DIR/call-a.out"
OUT_B="$RUN_TMP_DIR/call-b.out"

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
  <<'SQL'
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
  'concurrency-user',
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
  'concurrency-lot',
  'concurrency-user',
  'MIGRATION',
  20,
  20,
  'concurrency-lot-key'
);

INSERT INTO "StudioSession" (
  "id",
  "userId",
  "identityProfileId",
  "builderVersion",
  "builderConfig"
)
VALUES (
  'concurrency-session',
  'concurrency-user',
  'identity-test',
  1,
  '{"mode":"CUSTOM_SHOOT","shotCount":10}'::jsonb
);
SQL

cat > "$CALL_A_SQL" <<'SQL'
\set ON_ERROR_STOP on

BEGIN;

SELECT
  'RESULT=' ||
  string_agg(
    result."creationId"
      || ':'
      || result."shotIndex",
    ','
    ORDER BY result."shotIndex"
  )
FROM public.launch_mirava_session_shoot(
  'concurrency-user',
  'concurrency-session',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'shotIndex',
        g.idx,
        'shotIntent',
        'CONCURRENCY_' || g.idx,
        'masterPrompt',
        'CONCURRENCY PROMPT ' || g.idx,
        'negativePrompt',
        'CONCURRENCY NEGATIVE ' || g.idx
      )
      ORDER BY g.idx
    )
    FROM generate_series(
      0,
      9
    ) AS g(idx)
  )
) AS result;

SELECT pg_sleep(2);

COMMIT;
SQL

cat > "$CALL_B_SQL" <<'SQL'
\set ON_ERROR_STOP on

BEGIN;

SELECT
  'RESULT=' ||
  string_agg(
    result."creationId"
      || ':'
      || result."shotIndex",
    ','
    ORDER BY result."shotIndex"
  )
FROM public.launch_mirava_session_shoot(
  'concurrency-user',
  'concurrency-session',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'shotIndex',
        g.idx,
        'shotIntent',
        'CONCURRENCY_' || g.idx,
        'masterPrompt',
        'CONCURRENCY PROMPT ' || g.idx,
        'negativePrompt',
        'CONCURRENCY NEGATIVE ' || g.idx
      )
      ORDER BY g.idx
    )
    FROM generate_series(
      0,
      9
    ) AS g(idx)
  )
) AS result;

COMMIT;
SQL

echo "CONCURRENCY_CALL_A_START=TRUE"

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
    -At \
  < "$CALL_A_SQL" \
  > "$OUT_A" 2>&1 &

PID_A=$!

A_HOLDING_TRANSACTION=0

for _ in $(seq 1 50); do
  SLEEPING="$(
    docker exec "$CONTAINER" \
      psql \
        -U "$DB_USER" \
        -d "$DB" \
        -Atc "
          SELECT count(*)
          FROM pg_stat_activity
          WHERE
            datname = '$DB'
            AND state = 'active'
            AND query ~ 'pg_sleep\\(2\\)';
        "
  )"

  if [[ "$SLEEPING" -ge 1 ]]; then
    A_HOLDING_TRANSACTION=1
    break
  fi

  sleep 0.05
done

if [[ "$A_HOLDING_TRANSACTION" != "1" ]]; then
  echo "ERROR: call A never reached lock-holding phase"

  set +e
  wait "$PID_A"
  set -e

  cat "$OUT_A" || true
  exit 20
fi

echo "A_HOLDING_TRANSACTION=TRUE"
echo "CONCURRENCY_CALL_B_START=TRUE"

docker exec -i "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
    -At \
  < "$CALL_B_SQL" \
  > "$OUT_B" 2>&1 &

PID_B=$!

set +e

wait "$PID_A"
STATUS_A=$?

wait "$PID_B"
STATUS_B=$?

set -e

echo "STATUS_A=$STATUS_A"
echo "STATUS_B=$STATUS_B"

if [[ "$STATUS_A" != "0" ]]; then
  echo "===== CALL A FAILURE ====="
  cat "$OUT_A"
  exit 21
fi

if [[ "$STATUS_B" != "0" ]]; then
  echo "===== CALL B FAILURE ====="
  cat "$OUT_B"
  exit 22
fi

RESULT_A="$(
  grep '^RESULT=' "$OUT_A" \
    | tail -n 1
)"

RESULT_B="$(
  grep '^RESULT=' "$OUT_B" \
    | tail -n 1
)"

if [[ -z "$RESULT_A" ]]; then
  echo "ERROR: call A returned no canonical result"
  cat "$OUT_A"
  exit 23
fi

if [[ -z "$RESULT_B" ]]; then
  echo "ERROR: call B returned no canonical result"
  cat "$OUT_B"
  exit 24
fi

if [[ "$RESULT_A" != "$RESULT_B" ]]; then
  echo "ERROR: concurrent calls returned different creations"
  echo "A=$RESULT_A"
  echo "B=$RESULT_B"
  exit 25
fi

echo "CONCURRENT_RESULTS_IDENTICAL=TRUE"

docker exec "$CONTAINER" \
  psql \
    -U "$DB_USER" \
    -d "$DB" \
    -v ON_ERROR_STOP=1 \
    -c "
DO \$\$
DECLARE
  v_creations INTEGER;
  v_jobs INTEGER;
  v_allocations INTEGER;
  v_ledger INTEGER;
  v_balance INTEGER;
  v_remaining INTEGER;

  v_min_index INTEGER;
  v_max_index INTEGER;
  v_distinct_indexes INTEGER;
BEGIN
  SELECT
    count(*),
    min(\"shotIndex\"),
    max(\"shotIndex\"),
    count(
      DISTINCT \"shotIndex\"
    )
  INTO
    v_creations,
    v_min_index,
    v_max_index,
    v_distinct_indexes
  FROM \"StudioCreation\"
  WHERE
    \"sessionId\" = 'concurrency-session'
    AND \"parentCreationId\" IS NULL;

  SELECT count(*)
  INTO v_jobs
  FROM \"StudioJob\";

  SELECT count(*)
  INTO v_allocations
  FROM \"StudioCreditAllocation\";

  SELECT count(*)
  INTO v_ledger
  FROM \"StudioCreditLedger\";

  SELECT \"studioCredits\"
  INTO v_balance
  FROM \"User\"
  WHERE \"id\" = 'concurrency-user';

  SELECT \"remaining\"
  INTO v_remaining
  FROM \"StudioCreditLot\"
  WHERE \"id\" = 'concurrency-lot';

  IF
    v_creations <> 10
    OR v_jobs <> 10
    OR v_allocations <> 10
    OR v_ledger <> 20
    OR v_balance <> 10
    OR v_remaining <> 10
    OR v_min_index <> 0
    OR v_max_index <> 9
    OR v_distinct_indexes <> 10
  THEN
    RAISE EXCEPTION
      'CONCURRENCY_REGRESSION_FAILED creations=% jobs=% allocations=% ledger=% balance=% remaining=% min=% max=% distinct=%',
      v_creations,
      v_jobs,
      v_allocations,
      v_ledger,
      v_balance,
      v_remaining,
      v_min_index,
      v_max_index,
      v_distinct_indexes;
  END IF;

  RAISE NOTICE
    'REGRESSION_CONCURRENT_IDEMPOTENCE_PASS';
END
\$\$;
"

echo "CONCURRENT_FINAL_STATE=PASS"

echo
echo "===== POSTGRES REGRESSION PASS ====="
echo "LOCAL_BOOTSTRAP_ONLY=TRUE"
echo "REAL_RPC_MIGRATION_LOADED=TRUE"
echo "FUNCTIONAL_REGRESSION_EXECUTED=TRUE"
echo "CONCURRENCY_REGRESSION_EXECUTED=TRUE"
echo "REMOTE_DB_USED=FALSE"
echo "ENV_FILES_LOADED=FALSE"
echo "PROVIDER_CALLED=FALSE"
echo "REAL_CREDITS_USED=FALSE"
