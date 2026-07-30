# IMPLEMENTATION PROMPT TEMPLATE — LOT {{LOT_ID}}

## Context
- Project: {{PROJECT}}
- Run: {{RUN_ID}}
- Evidence level: {{EVIDENCE_LEVEL}}
- Repository: {{REPOSITORY}}
- URL: {{URL}}

## Skills
{{SKILLS}}

## Findings in scope
{{FINDINGS}}

## Objective
{{OBJECTIVE}}

## Allowed scope
{{ALLOWLIST}}

## Prohibited
- changes outside this lot;
- fabricated proof;
- framework migration;
- new dependency without approval;
- unrelated refactoring;
- deleting evidence;
- PASS before verification.

## Required execution
{{TASKS}}

## Acceptance criteria
{{ACCEPTANCE_CRITERIA}}

## Verification
{{VERIFICATION_COMMANDS}}

## Evidence to create
{{EVIDENCE_PATHS}}

## Final response
1. Status: PASS / BLOCKED / FAIL
2. Files changed
3. Findings addressed
4. Commands and results
5. Evidence
6. Remaining risks
7. One next authorized action
