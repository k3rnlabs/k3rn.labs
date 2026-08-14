import {
  createHash,
} from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import {
  basename,
  extname,
  join,
} from "node:path"

import {
  config as loadDotenv,
} from "dotenv"

loadDotenv({
  path:
    join(
      process.cwd(),
      ".env.local",
    ),
  override:
    false,
})

loadDotenv({
  path:
    join(
      process.cwd(),
      ".env",
    ),
  override:
    false,
})

type CandidateArtifact = {
  schemaVersion: 1
  universeId: string
  universeName: string
  universeVersion: string
  status: "candidate"
  sourceImage: string
  sourceSha256: string
  extractorVersion: string
  analysisModel: string
  compiledAt: string
  creativeDirectionSummary: string
  baseGenerationPrompt: string
  negativeGuardrails: string
  quality: {
    promptChars: number
    summaryChars: number
    negativeChars: number
    cameraLanguagePresent: boolean
    lightingLanguagePresent: boolean
    stylingLanguagePresent: boolean
    poseOrExpressionLanguagePresent: boolean
  }
}

function fail(
  message: string,
): never {
  throw new Error(
    `MIRAVA_OFFICIAL_UNIVERSE_COMPILER: ${message}`,
  )
}

function argumentValue(
  args: string[],
  key: string,
): string | null {
  const index =
    args.indexOf(
      key,
    )

  if (
    index < 0 ||
    index + 1 >=
      args.length
  ) {
    return null
  }

  return args[
    index + 1
  ] ?? null
}

function mimeTypeForImage(
  path: string,
): string {
  const extension =
    extname(path)
      .toLowerCase()

  if (
    extension ===
      ".png"
  ) {
    return "image/png"
  }

  if (
    extension ===
      ".webp"
  ) {
    return "image/webp"
  }

  if (
    extension ===
      ".jpg" ||
    extension ===
      ".jpeg"
  ) {
    return "image/jpeg"
  }

  fail(
    `unsupported image extension: ${extension}`,
  )
}

async function main():
Promise<void> {
  const args =
    process.argv.slice(
      2,
    )

  const universeId =
    args.find(
      (
        value,
      ) =>
        !value.startsWith(
          "--",
        ) &&
        value !==
          argumentValue(
            args,
            "--version",
          ),
    )

  const universeVersion =
    argumentValue(
      args,
      "--version",
    )

  if (!universeId) {
    fail(
      "usage: npm run mirava:compile-universe -- <universe-id> --version <semver>",
    )
  }

  if (
    !universeVersion ||
    !/^\d+\.\d+\.\d+$/.test(
      universeVersion,
    )
  ) {
    fail(
      "--version must be explicit semver, for example 2.0.0",
    )
  }

  /*
   * Dynamic imports are intentional.
   *
   * KIE/server configuration must see .env.local before
   * the provider module is evaluated.
   */
  const [
    universeModule,
    extractorModule,
    parserModule,
    providerModule,
  ] =
    await Promise.all([
      import(
        "../../src/lib/mirava/universes"
      ),
      import(
        "../../src/lib/mirava/prompts/visual-direction-extractor-v2"
      ),
      import(
        "../../src/lib/mirava/pipeline/parse-v2-extraction"
      ),
      import(
        "../../src/lib/visual-engine/kie-provider"
      ),
    ])

  const universe =
    universeModule
      .getMiravaUniverse(
        universeId,
      )

  if (!universe) {
    fail(
      `unknown official universe: ${universeId}`,
    )
  }

  if (
    !universe.image.startsWith(
      "/visual-engine/univers/",
    )
  ) {
    fail(
      `invalid official universe image: ${universe.image}`,
    )
  }

  const sourcePath =
    join(
      process.cwd(),
      "public",
      universe.image.replace(
        /^\/+/,
        "",
      ),
    )

  if (
    !existsSync(
      sourcePath,
    )
  ) {
    fail(
      `source image not found: ${sourcePath}`,
    )
  }

  const sourceBuffer =
    readFileSync(
      sourcePath,
    )

  if (
    sourceBuffer.length ===
      0
  ) {
    fail(
      "source image is empty",
    )
  }

  const sourceSha256 =
    createHash(
      "sha256",
    )
      .update(
        sourceBuffer,
      )
      .digest(
        "hex",
      )

  console.info(
    "[mirava-universe-compile-start]",
    JSON.stringify({
      universeId,
      universeVersion,
      sourceImage:
        universe.image,
      sourceSha256:
        sourceSha256.slice(
          0,
          16,
        ),
      extractorVersion:
        extractorModule
          .MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA
          .version,
    }),
  )

  /*
   * IMPORTANT:
   *
   * This deliberately mirrors extractMasterPrompt()
   * used by the normal user-reference route.
   *
   * We are not inventing a second prompting system for
   * official MIRAVA universes.
   */
  const result =
    await providerModule
      .runKieMultimodalAnalysis({
        systemPrompt:
          extractorModule
            .MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,

        userPrompt:
          [
            "Create the MIRAVA internal art direction from this single reference.",
            "Compose for a final 4:5 portrait-safe image.",
            "Return only the machine-readable extraction required by the system contract.",
          ].join(
            " ",
          ),

        images: [
          {
            buffer:
              sourceBuffer,
            mimeType:
              mimeTypeForImage(
                sourcePath,
              ),
            fileName:
              `official-universe-${universeId}-${basename(sourcePath)}`,
            label:
              "ART DIRECTION REFERENCE",
          },
        ],

        timeoutMs:
          150_000,
      })

  const content =
    result.text.trim()

  if (!content) {
    fail(
      "analysis provider returned empty content",
    )
  }

  const extraction =
    parserModule
      .parseV2Extraction(
        content,
      )

  /*
   * Quality gates are deliberately generic.
   * They do not hard-code what Beauty Close-up,
   * Escapade solaire, etc. are supposed to contain.
   *
   * The image must be allowed to define its own universe.
   */
  const promptLower =
    extraction
      .baseGenerationPrompt
      .toLowerCase()

  const quality = {
    promptChars:
      extraction
        .baseGenerationPrompt
        .length,

    summaryChars:
      extraction
        .creativeDirectionSummary
        .length,

    negativeChars:
      extraction
        .negativeGuardrails
        .length,

    cameraLanguagePresent:
      /\b(camera|lens|crop|framing|composition|perspective|focal)\b/i.test(
        promptLower,
      ),

    lightingLanguagePresent:
      /\b(light|lighting|flash|shadow|highlight|exposure)\b/i.test(
        promptLower,
      ),

    stylingLanguagePresent:
      /\b(wardrobe|garment|clothing|dress|top|jacket|jewelry|jewellery|hair|styling)\b/i.test(
        promptLower,
      ),

    poseOrExpressionLanguagePresent:
      /\b(pose|posture|expression|gaze|eyelid|mouth|head|shoulder)\b/i.test(
        promptLower,
      ),
  }

  if (
    quality.promptChars <
      1500
  ) {
    fail(
      `canonical prompt too shallow: ${quality.promptChars} characters`,
    )
  }

  if (
    quality.summaryChars <
      80
  ) {
    fail(
      "creative direction summary is too shallow",
    )
  }

  if (
    quality.negativeChars <
      80
  ) {
    fail(
      "negative guardrails are too shallow",
    )
  }

  const requiredSignals = [
    quality.cameraLanguagePresent,
    quality.lightingLanguagePresent,
    quality.stylingLanguagePresent,
    quality.poseOrExpressionLanguagePresent,
  ]

  if (
    requiredSignals.some(
      (
        signal,
      ) =>
        !signal,
    )
  ) {
    fail(
      `extraction failed generic fidelity gates: ${JSON.stringify(quality)}`,
    )
  }

  const artifact:
    CandidateArtifact = {
      schemaVersion:
        1,

      universeId,

      universeName:
        universe.name.fr,

      universeVersion,

      status:
        "candidate",

      sourceImage:
        universe.image,

      sourceSha256,

      extractorVersion:
        extractorModule
          .MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA
          .version,

      analysisModel:
        result.model,

      compiledAt:
        new Date()
          .toISOString(),

      creativeDirectionSummary:
        extraction
          .creativeDirectionSummary,

      baseGenerationPrompt:
        extraction
          .baseGenerationPrompt,

      negativeGuardrails:
        extraction
          .negativeGuardrails,

      quality,
    }

  const outputDirectory =
    join(
      process.cwd(),
      "docs",
      "mirava",
      "universe-artifacts",
      "candidates",
    )

  mkdirSync(
    outputDirectory,
    {
      recursive:
        true,
    },
  )

  const outputPath =
    join(
      outputDirectory,
      `${universeId}.json`,
    )

  writeFileSync(
    outputPath,
    `${JSON.stringify(
      artifact,
      null,
      2,
    )}\n`,
    "utf8",
  )

  console.info(
    "[mirava-universe-compile-ready]",
    JSON.stringify({
      universeId,
      universeVersion,
      outputPath,
      providerModel:
        result.model,
      creditsConsumed:
        result.creditsConsumed,
      inputTokens:
        result.inputTokens,
      outputTokens:
        result.outputTokens,
      quality,
    }),
  )

  console.log("")
  console.log(
    "===== MIRAVA CANONICAL CANDIDATE =====",
  )
  console.log(
    `Universe: ${universe.name.fr} (${universeId})`,
  )
  console.log(
    `Version candidate: ${universeVersion}`,
  )
  console.log(
    `Source: ${universe.image}`,
  )
  console.log(
    `Source SHA-256: ${sourceSha256}`,
  )
  console.log(
    `Extractor: ${artifact.extractorVersion}`,
  )
  console.log(
    `Model: ${artifact.analysisModel}`,
  )
  console.log(
    `Prompt chars: ${quality.promptChars}`,
  )
  console.log(
    `Candidate: ${outputPath}`,
  )
  console.log("")
  console.log(
    "No runtime MIRAVA generation path was modified.",
  )
}

main().catch(
  (
    error,
  ) => {
    console.error(
      error instanceof Error
        ? error.stack
        : error,
    )

    process.exitCode =
      1
  },
)
