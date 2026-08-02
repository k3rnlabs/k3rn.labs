export const MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_METADATA = {
  logicalName: "mirava_scene_context_classifier_v1",
  version: "1.0.0",
} as const

export const MIRAVA_SCENE_CONTEXT_CLASSIFIER_V1_PROMPT = `You classify extracted photographic directions for an image-generation prompt compiler.

You receive text describing an artistic reference. You never receive or analyze the future identity photographs.

Classify the scene according to the provided schema.

Do not identify or name any person.

Do not rewrite the creative direction.

Do not infer sexual intent from ordinary fashion, sportswear, swimwear, resortwear, or fashion-intimates contexts.

Use commercial_fashion_neutral wording when the scene is a standard fashion presentation requiring concise, neutral production vocabulary.

Mark preserve_exact_coverage whenever the wardrobe category or garment coverage must remain unchanged.

Return only schema-compliant JSON.`
