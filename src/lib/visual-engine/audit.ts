import { createAuditLog } from "@/lib/audit"

// Intentionally metadata-free: prompts, source photos, consent details and
// physical descriptions must never reach application logs or audit records.
export async function recordMiravaAudit(userId: string, action: string, creationId: string): Promise<void> {
  await createAuditLog({ userId, action, entity: "MIRAVA_STUDIO_CREATION", entityId: creationId, metadata: { product: "mirava_studio" } })
}
