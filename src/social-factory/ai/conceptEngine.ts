import { callLLM } from "@/lib/llm";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder";
import { validateConcepts, StoryConcept } from "./schemaGuard";
import { type StoryPayload } from "../schema/types";

/**
 * Orchestrates the generation of story concepts using the LLM.
 * Converts valid concepts into full story payloads.
 */
export async function generateStoryConcepts(
    intent: string,
    tone: string = "futuristic",
    variantsCount: number = 5
): Promise<StoryPayload[]> {
    try {
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt(intent, tone, variantsCount);

        const response = await callLLM([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], {
            model: "gpt-4o",
            temperature: 0.7, // Higher for creativity
            responseFormat: { type: "json_object" }
        });

        const data = JSON.parse(response.content);
        const rawConcepts = data.concepts ?? [];

        // 1. Validate what the AI produced
        const validConcepts = validateConcepts(rawConcepts);

        // 2. Hydrate valid concepts into full story payloads
        return validConcepts.map(concept => hydrateConceptToPayload(concept));

    } catch (error) {
        console.error("[conceptEngine] Error generating concepts:", error);
        // Fallback strategy: if LLM fails, we could return dummy concepts or empty array
        return [];
    }
}

/**
 * Hydrates a lightweight AI concept into a full StoryPayload.
 */
function hydrateConceptToPayload(concept: StoryConcept): StoryPayload {
    return {
        version: "1.0",
        platform: "instagram",
        format: "story",
        canvas: {
            width: 1080,
            height: 1920
        },
        safeZones: {
            top: 250,
            bottom: 250,
            left: 0,
            right: 0
        },
        templateId: concept.templateId as any,
        props: concept.props as any,
        brand: {
            theme: "default"
        },
        export: {
            type: "png",
            quality: 92
        }
    };
}
