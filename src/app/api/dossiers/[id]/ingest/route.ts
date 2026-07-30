import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/llm";
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook";
import crypto from "crypto";
import { CardType, RelationType } from "@prisma/client";
import { broadcastToChannel } from "@/lib/realtime-server";

export const dynamic = "force-dynamic";

const MAX_CARDS_PER_MESSAGE = 5;
const MIN_CONFIDENCE = 0.72;

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const startTime = Date.now();
    try {
        if (!hasValidInternalWebhookSecret(req)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dossierId = params.id;
        const body = await req.json();
        const { messageId, content, source } = body;

        if (!messageId || !content || !source) {
            return NextResponse.json(
                { error: "Missing required fields: messageId, content, source" },
                { status: 400 }
            );
        }

        // --- Invariant 2: Idempotency ---
        const idempotencyKey = crypto
            .createHash("sha256")
            .update(`${dossierId}_${messageId}`)
            .digest("hex");

        const existingLog = await prisma.cardIngestionLog.findUnique({
            where: { idempotencyKey },
        });

        if (existingLog) {
            return NextResponse.json(existingLog.result);
        }

        // --- Step 3: LLM Extraction ---
        const systemPrompt = `You are a strict data extraction architect.
Your goal is to parse user messages into structured 'Cards' representing aspects of a project.
Valid cardTypes: VISION, PROBLEM, TARGET, CONSTRAINT, SOLUTION, NOTE (which maps to IDEA/ANALYSIS/TASK usually, we adapt).

Focus ONLY on meaning. Extract up to ${MAX_CARDS_PER_MESSAGE} clear, distinct concepts.
If the message is empty or conversational, return an empty array.
Assign a confidence score (0.0 to 1.0) to each card.
Provide relationHints if the card explicitly refers to another concept.
Return ONLY a JSON object with this shape:
{"candidates":[{"cardType":"VISION|PROBLEM|TARGET|CONSTRAINT|SOLUTION|NOTE","title":"string","content":"string","confidence":0.0,"relationHints":[{"type":"string","targetHint":"string"}]}]}.`;

        const { content: llmContent } = await callLLM(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Context: Project ${dossierId}\nMessage: ${content}` }
            ],
            { model: "gpt-4o", responseFormat: { type: "json_object" }, temperature: 0.2, maxTokens: 1800 }
        );
        let candidates: any[] = [];
        try {
            const parsedArgs = JSON.parse(llmContent);
            candidates = Array.isArray(parsedArgs.candidates) ? parsedArgs.candidates : [];
        } catch (e) {
            console.error("Failed to parse card ingestion response", e);
        }

        // --- Step 4: Filtering ---
        const filteredCandidates = candidates
            .filter(c => c.confidence >= MIN_CONFIDENCE)
            .slice(0, MAX_CARDS_PER_MESSAGE);

        const result = {
            created: [] as any[],
            merged: [] as any[],
            relationsCreated: [] as any[],
            ignored: [] as any[]
        };

        if (filteredCandidates.length === 0) {
            const finalResult = { ...result, ignored: candidates };
            await prisma.cardIngestionLog.create({
                data: {
                    dossierId,
                    messageId,
                    idempotencyKey,
                    result: finalResult
                }
            });
            return NextResponse.json(finalResult);
        }

        // Gather existing cards for deduplication
        const existingCards = await prisma.card.findMany({
            where: { dossierId },
            select: { id: true, title: true, content: true }
        });

        for (const candidate of filteredCandidates) {
            // Enhanced fuzzy match by title (substring inclusion)
            const exactMatch = existingCards.find(
                ec => {
                    const ecTitle = ec.title.toLowerCase().trim();
                    const cTitle = candidate.title.toLowerCase().trim();
                    return ecTitle === cTitle || ecTitle.includes(cTitle) || cTitle.includes(ecTitle);
                }
            );

            // Map pseudo-type to real Prisma CardType
            let mappedType: CardType = CardType.IDEA;
            switch (candidate.cardType) {
                case "VISION": mappedType = CardType.VISION; break;
                case "PROBLEM": mappedType = CardType.PROBLEM; break;
                case "TARGET": mappedType = CardType.DECISION; break;
                case "CONSTRAINT": mappedType = CardType.ANALYSIS; break;
                case "SOLUTION": mappedType = CardType.IDEA; break;
            }

            if (exactMatch) {
                // --- Merge ---
                const mergedContent = { ...((exactMatch.content as any) || {}), mergedFrom: messageId, update: candidate.content };

                await prisma.card.update({
                    where: { id: exactMatch.id },
                    data: { content: mergedContent, updatedAt: new Date() }
                });
                result.merged.push({ id: exactMatch.id, title: candidate.title, type: mappedType });
            } else {
                // --- Create ---
                const newCard = await prisma.card.create({
                    data: {
                        dossierId,
                        title: candidate.title,
                        cardType: mappedType,
                        content: { text: candidate.content, sourceMessage: messageId },
                        source: source === "USER" ? "USER" : (source === "SYSTEM" ? "SYSTEM" : "EXPERT"),
                    }
                });
                result.created.push({ id: newCard.id, title: candidate.title, type: mappedType });
                existingCards.push({ id: newCard.id, title: candidate.title, content: newCard.content });

                // --- Step 5: Relations ---
                let relationCreated = false;
                if (candidate.relationHints && candidate.relationHints.length > 0) {
                    for (const hint of candidate.relationHints) {
                        const targetMatch = existingCards.find(ec => ec.title.toLowerCase().includes(hint.targetHint.toLowerCase()));
                        if (targetMatch && targetMatch.id !== newCard.id) {
                            await prisma.cardRelation.create({
                                data: {
                                    fromCardId: newCard.id,
                                    toCardId: targetMatch.id,
                                    type: RelationType.RELATES_TO
                                }
                            }).catch(() => { }); // catch unique constraints
                            relationCreated = true;
                            result.relationsCreated.push({ from: newCard.id, to: targetMatch.id });
                        }
                    }
                }

                // Invariant 4 compliance without explicit root relation: 
                // Setting dossierId acts as the root dossier link.
            }
        }

        // Save Idempotency Log
        await prisma.cardIngestionLog.create({
            data: {
                dossierId,
                messageId,
                idempotencyKey,
                result
            }
        });

        const totalProcessed = result.created.length + result.merged.length;

        // --- Step 3b: Realtime Broadcast ---
        if (totalProcessed > 0) {
            await broadcastToChannel(dossierId, "graph", {
                reason: "CARD_INGESTION",
                messageId,
                ts: new Date().toISOString()
            });
        }

        // --- Step 6: Log Metrics ---
        const latencyMs = Date.now() - startTime;
        const dedupeRate = totalProcessed > 0 ? (result.merged.length / totalProcessed) * 100 : 0;

        console.info(JSON.stringify({
            event: "CARD_INGESTION_METRICS",
            dossierId,
            messageId,
            cards_created_count: result.created.length,
            cards_merged_count: result.merged.length,
            dedupe_rate: dedupeRate.toFixed(2) + "%",
            ingestion_latency_ms: latencyMs,
            ignored_count: result.ignored.length
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Card Ingestion API Error]", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
