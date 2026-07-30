# Data Model

Entities: projects, audit_runs, audit_inputs, audit_sections, audit_findings, audit_scores, audit_prompt_packages, verification_runs and audit_artifacts.

Invariants:

- input artifacts are immutable;
- findings reference stable section IDs;
- findings have evidence;
- P0/P1 need verification;
- prompt packages retain finding snapshots;
- verification never rewrites original finding text.
