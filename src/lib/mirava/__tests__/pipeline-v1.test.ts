import { describe, expect, it } from "vitest"
import { parseV2Extraction } from "../pipeline/parse-v2-extraction"
import { heuristicSceneClassification } from "../pipeline/classify-scene-context"
import { compileGenerationPrompt } from "../pipeline/compile-generation-prompt"
import { complianceNeutralRewrite } from "../pipeline/compliance-neutral-rewrite"
import { MiravaPipelineError } from "../pipeline/pipeline-errors"
import {
  assertAtLeastOneValidatedIdentityImage,
  assertNoArtisticReferenceInGenerationPayload,
} from "../security/assert-image-role-separation"
import { VisualDirectionBlueprint } from "../schemas/visual-direction-blueprint.schema"
import {
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA,
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
} from "../prompts/visual-direction-extractor-v2"

describe("MIRAVA Visual Direction Pipeline V1", () => {
  describe("0. Extractor anatomy contract", () => {
    it("propagates strict five-toe anatomy requirements for visible feet and open footwear", () => {
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version).toBe("2.3.0")
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "exactly five distinct toes on each visible foot",
      )
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "four-toed feet",
      )
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "footwear straps that hide, remove, merge, or deform toe anatomy",
      )
    })

    it("propagates micro-anatomy, object, reflection, shadow, and identity-mark coherence", () => {
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "exactly five distinct fingers on each clearly visible hand",
      )
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "double rows of teeth",
      )
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "mirror and reflective surfaces",
      )
      expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain(
        "tattoos, scars, birthmarks, and distinctive traits only when supported",
      )
    })
  })

  describe("1. V2 Extraction Parser", () => {
    it("parses valid 3-section markdown with numbers and headers", () => {
      const markdown = `
### 1. SHORT CREATIVE DIRECTION SUMMARY
High-end commercial fashion editorial photograph in open shade natural lighting.

### 2. FINAL GENERATION PROMPT
A full-body vertical fashion shot of an adult model wearing a tailored beige linen suit. Soft directional open-shade sunlight from three-quarter left. Hardness is soft with gradual shadow roll-off on the right side.

### 3. NEGATIVE PROMPT / FAILURE GUARDRAILS
identity mixing, facial drift, malformed hands, distorted background, extra limbs
      `
      const parsed = parseV2Extraction(markdown)
      expect(parsed.creativeDirectionSummary).toContain("High-end commercial fashion")
      expect(parsed.baseGenerationPrompt).toContain("tailored beige linen suit")
      expect(parsed.negativeGuardrails).toContain("malformed hands")
    })

    it("parses valid 3-section markdown without section numbers", () => {
      const markdown = `
# SHORT CREATIVE DIRECTION SUMMARY
Resort campaign poolside photograph with warm golden-hour direct sunlight.

# FINAL GENERATION PROMPT
A waist-up portrait of an adult model by a luxury resort pool wearing opaque resortwear. Direct sunlight from 45-degree elevation. Deep shadow architecture behind shoulders.

# NEGATIVE PROMPT / FAILURE GUARDRAILS
identity drift, body distortion, invented fill light, HDR artifacts
      `
      const parsed = parseV2Extraction(markdown)
      expect(parsed.creativeDirectionSummary).toContain("Resort campaign")
      expect(parsed.baseGenerationPrompt).toContain("luxury resort pool")
      expect(parsed.negativeGuardrails).toContain("HDR artifacts")
    })

    it("throws MiravaPipelineError when a required section is missing", () => {
      const markdown = `
### 1. SHORT CREATIVE DIRECTION SUMMARY
Fashion editorial.

### 2. FINAL GENERATION PROMPT
A vertical photograph of a model in a blazer.
      `
      expect(() => parseV2Extraction(markdown)).toThrowError(MiravaPipelineError)
      try {
        parseV2Extraction(markdown)
      } catch (err) {
        expect((err as MiravaPipelineError).code).toBe("EXTRACTION_FORMAT_INVALID")
      }
    })

    it("throws MiravaPipelineError when input is empty", () => {
      expect(() => parseV2Extraction("")).toThrowError(MiravaPipelineError)
    })
  })

  describe("2. Scene Context Classification & Profiles", () => {
    it("classifies resort swimwear references correctly to swimwear_resort with coverage preservation", () => {
      const extraction = {
        creativeDirectionSummary: "Resort fashion campaign by a luxury swimming pool.",
        baseGenerationPrompt: "A model by a resort pool wearing opaque swimwear in direct sunlight.",
        negativeGuardrails: "identity mixing, altered coverage",
      }
      const classified = heuristicSceneClassification(extraction)
      expect(classified.sceneProfile).toBe("swimwear_resort")
      expect(classified.garmentContext).toBe("swimwear")
      expect(classified.coverageInstruction).toBe("preserve_exact_coverage")
      expect(classified.wordingProfile).toBe("commercial_fashion_neutral")
    })

    it("classifies tennis and sports references correctly to sports_fashion", () => {
      const extraction = {
        creativeDirectionSummary: "Tennis court sports fashion campaign.",
        baseGenerationPrompt: "A model on a clay court in athletic sportswear holding a racquet.",
        negativeGuardrails: "identity mixing, altered pose",
      }
      const classified = heuristicSceneClassification(extraction)
      expect(classified.sceneProfile).toBe("sports_fashion")
      expect(classified.garmentContext).toBe("sportswear")
    })

    it("classifies nightlife flash references correctly to nightlife_direct_flash", () => {
      const extraction = {
        creativeDirectionSummary: "Nightlife direct-flash party photograph.",
        baseGenerationPrompt: "Direct-flash photograph of a model in an evening dress at a dark party venue.",
        negativeGuardrails: "identity mixing, soft studio lighting",
      }
      const classified = heuristicSceneClassification(extraction)
      expect(classified.sceneProfile).toBe("nightlife_direct_flash")
      expect(classified.photographicGenre).toBe("nightlife_flash")
    })

    it("classifies elevator mirror selfie references correctly to mirror_selfie", () => {
      const extraction = {
        creativeDirectionSummary: "Elevator mirror selfie casual snapshot.",
        baseGenerationPrompt: "A realistic phone mirror selfie photograph inside a modern elevator with ceiling lights.",
        negativeGuardrails: "studio relighting, cinematic glow",
      }
      const classified = heuristicSceneClassification(extraction)
      expect(classified.sceneProfile).toBe("mirror_selfie")
      expect(classified.wordingProfile).toBe("social_photo_neutral")
    })
  })

  describe("3. Adaptive Prompt Compiler", () => {
    const sampleBlueprint: VisualDirectionBlueprint = {
      id: "bp_123",
      status: "published",
      transferMode: "FIDELITY",
      creativeDirectionSummary: "Resort campaign by a luxury pool.",
      baseGenerationPrompt: "A waist-up portrait of a model by a resort pool in direct sun.",
      negativeGuardrails: "identity mixing, HDR artifacts",
      sceneProfile: "swimwear_resort",
      photographicGenre: "resort_campaign",
      extractionMetadata: {
        extractorVersion: "2.0.0",
        classifierVersion: "1.0.0",
        model: "gpt-4o",
        createdAt: new Date().toISOString(),
        referenceAssetId: "ref_asset_1",
      },
      qualityFlags: {
        lightingContractPresent: true,
        cameraContractPresent: true,
        poseContractPresent: true,
        wardrobeContractPresent: true,
        identityLanguageDetected: false,
        requiresHumanReview: false,
      },
    }

    it("compiles a prompt with mandatory identity clause and profile framing", () => {
      const compiled = compileGenerationPrompt({
        blueprint: sampleBlueprint,
        sceneContext: {
          sceneProfile: "swimwear_resort",
          photographicGenre: "resort_campaign",
          garmentContext: "swimwear",
          coverageInstruction: "preserve_exact_coverage",
          referenceCharacter: "fidelity_sensitive",
          wordingProfile: "commercial_fashion_neutral",
          confidence: 0.95,
          requiresHumanReview: false,
        },
      })

      expect(compiled.positivePrompt).toContain("IDENTITY INVARIANT")
      expect(compiled.positivePrompt).toContain("Standard commercial swimwear campaign")
      expect(compiled.positivePrompt).toContain("TRANSFER_MODE = FIDELITY")
      expect(compiled.positivePrompt).toContain(
        "ADAPTIVE PHOTOGRAPHIC REALISM",
      )
      expect(compiled.positivePrompt).toContain(
        "IDENTITY-SAFE IMPERFECTIONS",
      )
      expect(compiled.negativeGuardrails).toContain("identity mixing")
      expect(compiled.negativeGuardrails).toContain(
        "invented tattoos",
      )
      expect(compiled.positivePrompt).toContain(
        "MICRO-ANATOMY AND OBJECT COHERENCE",
      )
      expect(compiled.positivePrompt).toContain(
        "exactly five distinct fingers",
      )
      expect(compiled.positivePrompt).toContain(
        "exactly five distinct toes",
      )
      expect(compiled.positivePrompt).toContain(
        "Mirrors and reflective surfaces must preserve the same identity",
      )
      expect(compiled.positivePrompt).toContain(
        "Tattoos, scars, birthmarks, and distinctive traits may appear only",
      )
      expect(compiled.negativeGuardrails).toContain(
        "six-fingered hands",
      )
      expect(compiled.negativeGuardrails).toContain(
        "double rows of teeth",
      )
      expect(compiled.negativeGuardrails).toContain(
        "different reflected identity",
      )
      expect(compiled.negativeGuardrails).toContain(
        "duplicated tattoos",
      )
      expect(compiled.negativeGuardrails).toContain(
        "four-toed feet",
      )
      expect(compiled.metadata.compilerVersion).toBe("1.3.0")
    })
  })

  describe("4. Security & Role Separation Assertions", () => {
    it("throws error when artistic reference image is passed into generation payload", () => {
      expect(() => {
        assertNoArtisticReferenceInGenerationPayload({ artisticReferenceImage: "http://ref.jpg" })
      }).toThrowError(MiravaPipelineError)

      expect(() => {
        assertNoArtisticReferenceInGenerationPayload({ assets: [{ kind: "REFERENCE" }] })
      }).toThrowError(MiravaPipelineError)
    })

    it("allows payload containing only identity images", () => {
      expect(() => {
        assertNoArtisticReferenceInGenerationPayload({ assets: [{ kind: "IDENTITY" }, { kind: "IDENTITY" }] })
      }).not.toThrow()
    })

    it("throws error when identity images array is empty", () => {
      expect(() => {
        assertAtLeastOneValidatedIdentityImage([])
      }).toThrowError(MiravaPipelineError)
    })
  })

  describe("5. Compliance Neutral Rewrite", () => {
    it("rewrites sensitive trigger words into neutral commercial fashion terminology", () => {
      const compiled = {
        positivePrompt: "A sexy model in a bikini by the pool.",
        negativeGuardrails: "identity drift",
        sceneProfile: "swimwear_resort" as const,
        metadata: {
          extractorVersion: "2.0.0",
          classifierVersion: "1.0.0",
          compilerVersion: "1.0.0",
          compiledAt: new Date().toISOString(),
        },
      }

      const rewritten = complianceNeutralRewrite(compiled)
      expect(rewritten.positivePrompt).not.toContain("sexy")
      expect(rewritten.positivePrompt).not.toContain("bikini")
      expect(rewritten.positivePrompt).toContain("swimwear")
      expect(rewritten.positivePrompt).toContain("editorial")
    })
  })

  it("preserves an adult lingerie campaign category during the conservative retry", () => {
    const rewritten = complianceNeutralRewrite({
      positivePrompt:
        "A premium adult lingerie campaign with sheer lace, confident editorial posture and directional studio light.",
      negativeGuardrails:
        "identity drift",
      sceneProfile:
        "standard_fashion" as const,
      metadata: {
        extractorVersion:
          "2.0.0",
        classifierVersion:
          "1.0.0",
        compilerVersion:
          "1.0.0",
        compiledAt:
          new Date().toISOString(),
      },
    })

    expect(
      rewritten.positivePrompt.toLowerCase(),
    ).toContain(
      "lingerie",
    )

    expect(
      rewritten.positivePrompt.toLowerCase(),
    ).not.toContain(
      "fashion apparel",
    )

    expect(
      rewritten.positivePrompt.toLowerCase(),
    ).toContain(
      "opaque",
    )
  })

})
