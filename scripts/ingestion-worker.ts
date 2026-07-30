/**
 * Outbox Ingestion Worker
 *
 * Polls the `CardIngestionJob` table for PENDING jobs and processes them.
 * Implements at-least-once delivery with exponential backoff and max retries.
 *
 * Usage:      npx tsx scripts/ingestion-worker.ts
 * In prod:    pm2 start scripts/ingestion-worker.ts --interpreter tsx --name k3rn-worker
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { CardIngestionParams } from "../src/lib/card-ingestion";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 10;

function backoffMs(attempts: number): number {
    // 2^attempts × 5s: 5s, 10s, 20s, 40s, 80s
    return Math.pow(2, attempts) * 5_000;
}

async function ingestNow(params: CardIngestionParams): Promise<void> {
    const url = `${APP_URL}/api/dossiers/${params.dossierId}/ingest`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

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
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

async function processJobs(): Promise<void> {
    const now = new Date().toISOString();

    const { data: jobs, error } = await supabase
        .from("CardIngestionJob")
        .select("*")
        .eq("status", "PENDING")
        .lte("nextRunAt", now)
        .order("nextRunAt", { ascending: true })
        .limit(BATCH_SIZE);

    if (error) {
        console.error("[Worker] Error fetching jobs:", error.message);
        return;
    }

    if (!jobs || jobs.length === 0) return;

    console.info(JSON.stringify({ event: "WORKER_POLL", jobCount: jobs.length, ts: now }));

    for (const job of jobs) {
        // Mark RUNNING atomically to prevent double-processing
        const { data: claimed } = await supabase
            .from("CardIngestionJob")
            .update({ status: "RUNNING" })
            .eq("id", job.id)
            .eq("status", "PENDING")
            .select("id")

        if (!claimed?.length) continue;

        const params = job.payload as CardIngestionParams;

        try {
            await ingestNow(params);

            await supabase
                .from("CardIngestionJob")
                .update({ status: "DONE" })
                .eq("id", job.id);

            console.info(JSON.stringify({
                event: "JOB_DONE",
                jobId: job.id,
                messageId: job.messageId,
                dossierId: job.dossierId,
                attempts: job.attempts + 1,
            }));
        } catch (err) {
            const newAttempts = job.attempts + 1;
            const isFailed = newAttempts >= MAX_ATTEMPTS;

            await supabase
                .from("CardIngestionJob")
                .update({
                    status: isFailed ? "FAILED" : "PENDING",
                    attempts: newAttempts,
                    nextRunAt: isFailed
                        ? new Date().toISOString()
                        : new Date(Date.now() + backoffMs(newAttempts)).toISOString(),
                })
                .eq("id", job.id);

            console.error(JSON.stringify({
                event: isFailed ? "JOB_FAILED" : "JOB_RETRY",
                jobId: job.id,
                messageId: job.messageId,
                dossierId: job.dossierId,
                attempts: newAttempts,
                error: String(err),
                nextRunAt: isFailed ? null : new Date(Date.now() + backoffMs(newAttempts)).toISOString(),
            }));
        }
    }
}

async function main(): Promise<void> {
    console.info("[Ingestion Worker] Starting...");

    // Recover any RUNNING jobs left from a previous crash
    const { count: staleCount } = await supabase
        .from("CardIngestionJob")
        .update({ status: "PENDING", nextRunAt: new Date().toISOString() })
        .eq("status", "RUNNING");

    if ((staleCount ?? 0) > 0) {
        console.info(`[Ingestion Worker] Recovered ${staleCount} stale RUNNING job(s).`);
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await processJobs();
        } catch (err) {
            console.error("[Ingestion Worker] Unexpected error in poll loop:", err);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

main().catch(err => {
    console.error("[Ingestion Worker] Fatal error, shutting down:", err);
    process.exit(1);
});
