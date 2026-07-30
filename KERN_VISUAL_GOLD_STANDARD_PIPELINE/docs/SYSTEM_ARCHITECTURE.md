# System Architecture

Recommended stack: Next.js App Router, TypeScript, shadcn/ui, Supabase Auth/Postgres/Storage, structured model outputs validated with JSON Schema/Zod, and a durable background workflow.

## Separate model passes

1. page map;
2. visual audit;
3. AI fingerprint;
4. CRO/copy;
5. art direction;
6. synthesis;
7. prompts;
8. verification.

Do not use one oversized call. Separate passes reduce anchoring and make retries deterministic.

## Idempotency

`run_id + phase_id + input_hash + prompt_version`

Persist prompt, schema, model and skill versions with each phase.
