---
name: kern-visual-audit
description: >
  Evidence-based landing-page and product-surface audit pipeline for desktop/mobile
  screenshots, URLs, and repositories. Use when the user asks to audit a landing page,
  detect AI-generated design tells, assess positioning/CRO, create prioritized findings,
  generate remediation prompts, or verify before/after screenshots.
license: Proprietary project skill for KERN Labs
---

# KERN Visual Audit

## Trigger

Use when the task includes desktop/mobile screenshots, landing-page audit, gold-standard review, AI-design tells, visual/CRO review, before/after verification or prompt generation from findings.

## Workflow

1. Validate inputs.
2. Set evidence level A/B/C.
3. Map page neutrally.
4. Run separate visual, AI-fingerprint, CRO/copy and art-direction passes.
5. Run technical audit only with URL/repository.
6. Validate findings.
7. Score and prioritize.
8. Generate three prompts per lot.
9. Verify independently.
10. Apply final gates.

## Non-negotiable

- Never claim AI authorship.
- Never invent exact CSS from screenshots.
- Never invent proof.
- Never mutate during audit or verification.
- Never issue PASS without evidence.
- Every finding requires evidence and verification.

Read the project `MASTER_PROMPT.md` when available. Otherwise use bundled references.
