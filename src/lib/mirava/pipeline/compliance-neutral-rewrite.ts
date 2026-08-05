import { CompiledGenerationPrompt } from "../schemas/compiled-generation-prompt.schema"
import { adaptMiravaCoverageForGeneration } from "./coverage-safety-adaptation"

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
    /*
     * Lingerie reste une catégorie commerciale légitime. La réduction du
     * risque est assurée plus bas par la couverture opaque, la pose et le
     * cadrage, plutôt que par la suppression de la catégorie elle-même.
     */
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

  // Ensure explicit commercial fashion phrasing is present.
  if (!prompt.toLowerCase().includes("commercial fashion")) {
    prompt = `Create a standard neutral commercial fashion campaign. ${prompt}`
  }

  // A safety retry must alter the visual construction, not only vocabulary.
  // Conservative mode enforces opaque coverage even when the provider refusal
  // was broader than the deterministic risk signals.
  const coverageSafe =
    adaptMiravaCoverageForGeneration(
      prompt,
      "conservative",
    )

  return {
    ...compiledPrompt,
    positivePrompt: coverageSafe.prompt,
    metadata: {
      ...compiledPrompt.metadata,
      compiledAt: new Date().toISOString(),
    },
  }
}
