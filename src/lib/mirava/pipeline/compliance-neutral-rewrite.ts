import { CompiledGenerationPrompt } from "../schemas/compiled-generation-prompt.schema"

/**
 * Compliance Neutral Rewrite Moteur (`compliance_neutral_rewrite`).
 * Executes a single neutral commercial fashion rewrite when a provider safety refusal occurs.
 * Replaces ambiguous or overly sensitive phrasing with neutral commercial production terminology
 * while preserving opaque fabric construction, garment coverage, scene composition, and pose.
 */
export function complianceNeutralRewrite(compiledPrompt: CompiledGenerationPrompt): CompiledGenerationPrompt {
  let prompt = compiledPrompt.positivePrompt

  // Replace sensitive or trigger words with neutral commercial fashion terms
  const replacements: Array<[RegExp, string]> = [
    [/\bsexy\b/gi, "editorial"],
    [/\bhot\b/gi, "vibrant"],
    [/\bprovocative\b/gi, "striking"],
    [/\bseductive\b/gi, "engaging"],
    [/\bsensual\b/gi, "expressive"],
    [/\blingerie\b/gi, "fashion apparel"],
    [/\bbikini\b/gi, "swimwear"],
    [/\bcleavage\b/gi, "neckline"],
    [/\bbARE\b/gi, "visible"],
    [/\bSKINNY\b/gi, "slender"],
    [/\bTIGHT\b/gi, "fitted"],
    [/\bTRANSPARENT\b/gi, "opaque"],
    [/\bSHEER\b/gi, "structured fabric"],
  ]

  for (const [pattern, replacement] of replacements) {
    prompt = prompt.replace(pattern, replacement)
  }

  // Ensure explicit commercial fashion phrasing is present
  if (!prompt.toLowerCase().includes("commercial fashion")) {
    prompt = `Create a standard neutral commercial fashion campaign. ${prompt}`
  }

  return {
    ...compiledPrompt,
    positivePrompt: prompt,
    metadata: {
      ...compiledPrompt.metadata,
      compiledAt: new Date().toISOString(),
    },
  }
}
