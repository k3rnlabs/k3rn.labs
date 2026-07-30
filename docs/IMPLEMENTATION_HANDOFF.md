# Implementation Handoff

Implement the MVP in the existing KERN Labs repository using `MASTER_PROMPT.md`.

Before writing: inspect repo instructions, versions, auth/storage/billing, reusable components, migrations and quality scripts. Produce a file allowlist and additive plan.

First vertical slice:

Create project → upload desktop/mobile → create run → validate inputs → show progress → persist page map/findings → render report.

The first slice may use deterministic mock specialist outputs behind a schema-validated interface.

Verify typecheck, lint, tests, migrations, RLS, upload authorization, desktop/mobile E2E, export and delete flow.
