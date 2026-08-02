import { visualDirectionExtractionSchema, VisualDirectionExtraction } from "../schemas/visual-direction-extraction.schema"
import { MiravaPipelineError } from "./pipeline-errors"

/**
 * Deterministic parser for MIRAVA Visual Direction Transfer Engine V2 extraction outputs.
 * Parses the three mandatory sections:
 * 1. SHORT CREATIVE DIRECTION SUMMARY
 * 2. FINAL GENERATION PROMPT
 * 3. NEGATIVE PROMPT / FAILURE GUARDRAILS
 */
export function parseV2Extraction(markdownText: string): VisualDirectionExtraction {
  if (!markdownText || typeof markdownText !== "string" || markdownText.trim().length === 0) {
    throw new MiravaPipelineError("Extraction response text is empty.", "EXTRACTION_FORMAT_INVALID")
  }

  // Regex patterns to identify section headers (case-insensitive, optional heading symbols or numbers)
  const summaryHeaderRegex = /^(?:#{1,6}\s*)?(?:\d+\.\s*)?SHORT CREATIVE DIRECTION SUMMARY/i
  const promptHeaderRegex = /^(?:#{1,6}\s*)?(?:\d+\.\s*)?FINAL GENERATION PROMPT/i
  const negativeHeaderRegex = /^(?:#{1,6}\s*)?(?:\d+\.\s*)?NEGATIVE PROMPT(?:\s*\/\s*FAILURE GUARDRAILS)?/i

  const lines = markdownText.split(/\r?\n/)

  let currentSection: "summary" | "prompt" | "negative" | null = null
  const summaryLines: string[] = []
  const promptLines: string[] = []
  const negativeLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (summaryHeaderRegex.test(trimmed)) {
      currentSection = "summary"
      continue
    } else if (promptHeaderRegex.test(trimmed)) {
      currentSection = "prompt"
      continue
    } else if (negativeHeaderRegex.test(trimmed)) {
      currentSection = "negative"
      continue
    }

    if (currentSection === "summary") {
      summaryLines.push(line)
    } else if (currentSection === "prompt") {
      promptLines.push(line)
    } else if (currentSection === "negative") {
      negativeLines.push(line)
    }
  }

  const creativeDirectionSummary = summaryLines.join("\n").trim()
  const baseGenerationPrompt = promptLines.join("\n").trim()
  const negativeGuardrails = negativeLines.join("\n").trim()

  if (!creativeDirectionSummary) {
    throw new MiravaPipelineError(
      "Extraction missing mandatory section: SHORT CREATIVE DIRECTION SUMMARY",
      "EXTRACTION_FORMAT_INVALID"
    )
  }
  if (!baseGenerationPrompt) {
    throw new MiravaPipelineError(
      "Extraction missing mandatory section: FINAL GENERATION PROMPT",
      "EXTRACTION_FORMAT_INVALID"
    )
  }
  if (!negativeGuardrails) {
    throw new MiravaPipelineError(
      "Extraction missing mandatory section: NEGATIVE PROMPT / FAILURE GUARDRAILS",
      "EXTRACTION_FORMAT_INVALID"
    )
  }

  const parseResult = visualDirectionExtractionSchema.safeParse({
    creativeDirectionSummary,
    baseGenerationPrompt,
    negativeGuardrails,
  })

  if (!parseResult.success) {
    throw new MiravaPipelineError(
      `Extraction content validation failed: ${parseResult.error.message}`,
      "EXTRACTION_FORMAT_INVALID"
    )
  }

  return parseResult.data
}
