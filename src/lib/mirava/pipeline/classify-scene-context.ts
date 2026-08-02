import { callLLM } from "@/lib/llm"
import { MIRAVA_ANALYSIS_MODEL } from "@/lib/mirava/server-config"
import { MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_PROMPT } from "../prompts/scene-context-classifier-v1"
import { sceneContextClassificationSchema, SceneContextClassification } from "../schemas/scene-context.schema"
import { VisualDirectionExtraction } from "../schemas/visual-direction-extraction.schema"
import { MiravaPipelineError } from "./pipeline-errors"

/**
 * Classifies an extracted visual direction into structured scene context parameters.
 * IMPORTANT: Receives ONLY extracted text. NEVER receives identity photographs or user info.
 */
export async function classifySceneContext(
  extraction: VisualDirectionExtraction
): Promise<SceneContextClassification> {
  const userContent = `Extracted Creative Direction Summary:
${extraction.creativeDirectionSummary}

Extracted Base Generation Prompt:
${extraction.baseGenerationPrompt}

Extracted Negative Guardrails:
${extraction.negativeGuardrails}`

  try {
    const { content } = await callLLM(
      [
        { role: "system", content: MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_PROMPT },
        { role: "user", content: userContent },
      ],
      {
        model: MIRAVA_ANALYSIS_MODEL,
        responseFormat: { type: "json_object" },
        temperature: 0.1,
        timeoutMs: 30_000,
      }
    )

    const parsedJson = JSON.parse(content)
    const result = sceneContextClassificationSchema.safeParse(parsedJson)
    if (result.success) return result.data

    // If partial or invalid JSON schema returned, fall back to heuristic classifier
    return heuristicSceneClassification(extraction)
  } catch (error) {
    if (error instanceof MiravaPipelineError) throw error
    // Fall back to heuristic rule-based classification if LLM provider fails
    return heuristicSceneClassification(extraction)
  }
}

/**
 * Deterministic heuristic classifier used as a fallback or for offline classification.
 */
export function heuristicSceneClassification(
  extraction: VisualDirectionExtraction
): SceneContextClassification {
  const text = `${extraction.creativeDirectionSummary} ${extraction.baseGenerationPrompt}`.toLowerCase()

  let sceneProfile: SceneContextClassification["sceneProfile"] = "standard_fashion"
  let garmentContext: SceneContextClassification["garmentContext"] = "standard_clothing"
  let photographicGenre: SceneContextClassification["photographicGenre"] = "commercial_campaign"

  if (text.includes("swimwear") || text.includes("pool") || text.includes("bikini") || text.includes("resort")) {
    sceneProfile = "swimwear_resort"
    garmentContext = "swimwear"
    photographicGenre = "resort_campaign"
  } else if (text.includes("sport") || text.includes("tennis") || text.includes("gym") || text.includes("athletic")) {
    sceneProfile = "sports_fashion"
    garmentContext = "sportswear"
    photographicGenre = "sports_campaign"
  } else if (text.includes("nightlife") || text.includes("direct-flash") || text.includes("party") || text.includes("club")) {
    sceneProfile = "nightlife_direct_flash"
    garmentContext = "standard_clothing"
    photographicGenre = "nightlife_flash"
  } else if (text.includes("mirror") || text.includes("selfie") || text.includes("elevator")) {
    sceneProfile = "mirror_selfie"
    garmentContext = "standard_clothing"
    photographicGenre = "mirror_selfie"
  } else if (text.includes("beauty") || text.includes("close-up") || text.includes("skin") || text.includes("makeup")) {
    sceneProfile = "beauty_closeup"
    garmentContext = "standard_clothing"
    photographicGenre = "beauty_campaign"
  } else if (text.includes("intimate") || text.includes("sleepwear")) {
    sceneProfile = "fashion_intimates"
    garmentContext = "fashion_intimates"
    photographicGenre = "fashion_editorial"
  } else if (text.includes("luxury") || text.includes("haute couture")) {
    sceneProfile = "luxury_editorial"
    garmentContext = "eveningwear"
    photographicGenre = "fashion_editorial"
  } else if (text.includes("travel") || text.includes("resort")) {
    sceneProfile = "travel_editorial"
    garmentContext = "resortwear"
    photographicGenre = "fashion_editorial"
  }

  const coverageInstruction: SceneContextClassification["coverageInstruction"] =
    garmentContext === "swimwear" || garmentContext === "fashion_intimates"
      ? "preserve_exact_coverage"
      : "not_applicable"

  const wordingProfile: SceneContextClassification["wordingProfile"] =
    sceneProfile === "mirror_selfie"
      ? "social_photo_neutral"
      : garmentContext === "swimwear" || garmentContext === "fashion_intimates" || garmentContext === "sportswear"
      ? "commercial_fashion_neutral"
      : "standard"

  return {
    sceneProfile,
    photographicGenre,
    garmentContext,
    coverageInstruction,
    referenceCharacter: "fidelity_sensitive",
    wordingProfile,
    confidence: 0.95,
    requiresHumanReview: false,
  }
}
