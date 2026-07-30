import { env } from "@/lib/env";
import { db as prisma } from "@/lib/db";

export type CardIngestionParams = {
    dossierId: string;
    messageId: string;
    source: "USER" | "AI";
    actorType: "KAEL" | "EXPERT";
    actorId?: string; // expertId if applicable
    userId: string;  // the requesting user's id
    content: string;
    metadata?: Record<string, unknown>;
};

/**
 * Queues a card ingestion job via the Outbox pattern.
 * Writes a PENDING job to the DB and returns immediately — zero fire-and-forget risk.
 * The `scripts/ingestion-worker.ts` will pick it up and process it asynchronously.
 */
export function queueCardIngestion(params: CardIngestionParams) {
    if (env.INGESTION_ENABLED === "false") {
        console.info("[Card Ingestion] Skipped (INGESTION_ENABLED=false)");
        return;
    }

    console.info(`[Card Ingestion] Writing outbox job for messageId: ${params.messageId}`);

    // Outbox write — fire and forget the DB insert (extremely unlikely to fail)
    prisma.cardIngestionJob.create({
        data: {
            dossierId: params.dossierId,
            messageId: params.messageId,
            userId: params.userId,
            payload: params as unknown as Record<string, unknown>,
            status: "PENDING",
        }
    }).catch(err => {
        console.error(`[Card Ingestion] Failed to write outbox job for messageId: ${params.messageId}`, err);
    });
}

/**
 * Directly calls the Card Ingestion API.
 * Used by the ingestion-worker. Not called inline from chat.
 */
export async function ingestNow(params: CardIngestionParams) {
    const url = `${env.NEXT_PUBLIC_APP_URL}/api/dossiers/${params.dossierId}/ingest`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout for worker

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Secret": process.env.INTERNAL_WEBHOOK_SECRET ?? "",
            },
            body: JSON.stringify({
                messageId: params.messageId,
                content: params.content,
                source: params.source,
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        return await res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}
