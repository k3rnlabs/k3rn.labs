# API Contract

- `POST /api/projects`
- `POST /api/audits`
- `POST /api/audits/:runId/inputs/complete`
- `POST /api/audits/:runId/run`
- `GET /api/audits/:runId`
- `GET /api/audits/:runId/findings`
- `POST /api/audits/:runId/lots`
- `POST /api/audits/:runId/prompts`
- `POST /api/audits/:runId/verifications`
- `GET /api/audits/:runId/export?format=json|markdown|html`

All run/resume endpoints must be idempotent.

Error shape:

```json
{"error":{"code":"INPUT_MISSING","message":"Mobile capture is required","details":{},"retryable":false}}
```
