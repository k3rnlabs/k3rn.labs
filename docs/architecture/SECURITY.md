# Security Design & Practices — K3RN Labs

## 1. Environment & Secrets
All sensitive configuration is managed via environment variables and validated at runtime using Zod in `src/lib/env.ts`.

- **Supabase**: `SERVICE_ROLE_KEY` is restricted to server-side environments.
- **Internal workers**: calls between K3RN services are authenticated using `X-Internal-Secret` and `INTERNAL_WEBHOOK_SECRET`.
- **Telegram**: inbound bot updates are authenticated using Telegram's `X-Telegram-Bot-Api-Secret-Token` and `TELEGRAM_WEBHOOK_SECRET`.

## 2. API Security
- **Ingestion Route**: `/api/dossiers/[id]/ingest` implements mandatory `X-Internal-Secret` validation to prevent unauthorized data injection.
- **Idempotency**: All ingestion operations use SHA-256 based idempotency keys (dossierId + messageId) to prevent duplicate processing.

## 3. Data Integrity
- **Zod Validation**: All incoming API requests and environment variables are strictly typed and validated.
- **Historical K3RN tables**: The 30 legacy tables are server-owned. RLS is enabled without browser policies, and all table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`. Access goes through authenticated Next.js routes using the PostgreSQL owner or `service_role`.
- **Ownership isolation**: Dossier, mission, session, card, document, task, investment, and notification access is authorized in server routes through the owning `User` or parent `Dossier`; direct Supabase Data API access is denied.
- **MIRAVA Studio**: Studio tables keep RLS enabled with no client policies. Transactional `SECURITY DEFINER` functions are executable by `service_role` only.
- **API DTO allowlists**: Pole, Expert, and PoleSession responses explicitly omit system prompts and joined Dossier data.
- **Supabase client boundary**: Browser subscriptions use `src/lib/supabase.ts`; privileged storage and broadcast operations use server-only import paths backed by `src/lib/supabase-admin.ts`.

## 4. Media & Storage
- **Public Avatars**: The `avatars` bucket in Supabase is configured for public read access to allow optimized delivery via Next.js `Image`. 
- **Upload Integrity**: All user-provided images are processed client-side via `Canvas` to strip metadata (EXIF) and normalize formats before server-side storage.

## 5. Referral & Affiliate Security
- **OG Generation**: Dynamic OpenGraph images are generated server-side using a sandboxed Edge Runtime to prevent SSRF vulnerabilities.
- **Referral Cookies**: Attribution is handled via signed cookies (`k3rn_referral`) to ensure integrity throughout the application journey.

## 6. Exclusion Policy
- **.gitignore**: Strictly excludes `.env`, `.claude/`, `.gemini/`, and other local/AI artifacts from version control.
