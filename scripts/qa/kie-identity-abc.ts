import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

import {
  loadEnvConfig,
} from "@next/env"


type Variant =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"

type CaseName =
  | "watermelon"
  | "pool"
  | "lingerie"
  | "fit"


type DatasetManifest = {
  schemaVersion:
    "mirava-kie-abc-test-dataset/v2"

  datasetName: string

  identity: string[]

  artDirection: Record<
    CaseName,
    string
  >

  variants: Variant[]
}


const ROOT =
  process.cwd()

loadEnvConfig(
  ROOT,
)


const datasetRoot =
  process.env
    .MIRAVA_KIE_ABC_DATASET_ROOT
    ?.trim()

if (!datasetRoot) {
  throw new Error(
    "MIRAVA_KIE_ABC_DATASET_ROOT is required.",
  )
}


const manifestPath =
  path.join(
    datasetRoot,
    "manifest.json",
  )

if (
  !fs.existsSync(
    manifestPath,
  )
) {
  throw new Error(
    `Missing dataset manifest: ${manifestPath}`,
  )
}


const manifest =
  JSON.parse(
    fs.readFileSync(
      manifestPath,
      "utf8",
    ),
  ) as DatasetManifest


if (
  manifest.schemaVersion !==
  "mirava-kie-abc-test-dataset/v2"
) {
  throw new Error(
    `Unexpected dataset schema: ${manifest.schemaVersion}`,
  )
}


if (
  ![
    3,
    4,
  ].includes(
    manifest.identity.length,
  )
) {
  throw new Error(
    `Expected three or four identity images; got ${manifest.identity.length}.`,
  )
}


const CASES:
  CaseName[] = [
    "watermelon",
    "pool",
    "lingerie",
    "fit",
  ]


const DIRECTIONS:
  Record<
    CaseName,
    string
  > = {
  watermelon: [
    "Vertical close beach beauty portrait.",
    "Adult model facing the camera almost frontally.",
    "She holds a large red watermelon slice horizontally with both hands immediately below and partly in front of the mouth.",
    "Tight head-and-upper-torso framing.",
    "Hair pulled into a high sleek bun.",
    "Large gold hoop earrings.",
    "Warm direct sunlight with natural beach background and shallow depth of field.",
    "Brown swimwear is visible at the shoulders and upper torso.",
    "Preserve natural skin texture and realistic anatomy.",
  ].join(" "),

  pool: [
    "Vertical black-and-white editorial pool portrait.",
    "Adult model photographed chest-up while standing in water.",
    "Head in a slight three-quarter orientation toward camera.",
    "Wet dark hair swept back with a few wet strands around the face.",
    "Visible water droplets on face, shoulders and neck.",
    "Strong defined eye makeup and dark lips as surface styling only.",
    "Reflective rippled water fills the background.",
    "High-contrast monochrome photographic finish.",
    "Preserve natural facial anatomy and realistic skin texture.",
  ].join(" "),

  lingerie: [
    "Vertical full-body commercial fashion photograph in a modern dark interior with staircase and glass railing.",
    "Adult model wears a black fashion bodysuit with sheer long sleeves and opaque coverage of private anatomy.",
    "Body in a dynamic three-quarter standing pose beside the stairs.",
    "One arm reaches toward a railing while the other anchors to the opposite side.",
    "Camera slightly below chest level with full figure visible.",
    "Dark architectural environment, ceiling spotlights and clean editorial lighting.",
    "No explicit sexual activity.",
    "Preserve realistic anatomy and natural facial identity.",
  ].join(" "),

  fit: [
    "Vertical full-body athletic fashion mirror-selfie composition inside a stainless-steel elevator.",
    "Adult model wears a fitted sleeveless purple athletic one-piece romper with shorts.",
    "Long straight dark hair.",
    "One arm is raised high holding a smartphone for a mirror selfie.",
    "The smartphone must be held high and laterally beside the head, outside the facial silhouette.",
    "The smartphone, hand and arm must never overlap or hide any part of the face.",
    "A large black gym tote is present while keeping the face completely unobstructed.",
    "The opposite arm hangs naturally by the body.",
    "Full body visible from head to shoes area with metallic elevator doors behind.",
    "The entire face must remain clearly visible: both eyes, both eyebrows, complete nose, nostrils, both cheeks, lips, jawline and chin.",
    "No hair, smartphone, hand, arm, bag or other object may cover the eyes, nose, mouth, cheeks, jawline or chin.",
    "Preserve the exact recognizable facial identity from the identity reference images, including facial proportions, eye shape, eyebrow geometry, nose shape, lip shape, jaw and chin.",
    "Natural fitness-lifestyle photography with realistic anatomy.",
  ].join(" "),
}


function sha256(
  value:
    Buffer |
    string,
): string {
  return crypto
    .createHash(
      "sha256",
    )
    .update(
      value,
    )
    .digest(
      "hex",
    )
}


function mimeFor(
  file: string,
): string {
  const ext =
    path
      .extname(file)
      .toLowerCase()

  if (
    ext === ".jpg" ||
    ext === ".jpeg"
  ) {
    return "image/jpeg"
  }

  if (ext === ".png") {
    return "image/png"
  }

  if (ext === ".webp") {
    return "image/webp"
  }

  throw new Error(
    `Unsupported image extension: ${file}`,
  )
}


function imageExtension(
  buffer: Buffer,
): string {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return ".png"
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return ".jpg"
  }

  if (
    buffer.length >= 12 &&
    buffer
      .subarray(
        0,
        4,
      )
      .toString(
        "ascii",
      ) === "RIFF" &&
    buffer
      .subarray(
        8,
        12,
      )
      .toString(
        "ascii",
      ) === "WEBP"
  ) {
    return ".webp"
  }

  return ".bin"
}


function absoluteDatasetFile(
  relative: string,
): string {
  const resolved =
    path.resolve(
      datasetRoot!,
      relative,
    )

  const relativeCheck =
    path.relative(
      path.resolve(
        datasetRoot!,
      ),
      resolved,
    )

  if (
    relativeCheck.startsWith(
      "..",
    ) ||
    path.isAbsolute(
      relativeCheck,
    )
  ) {
    throw new Error(
      `Dataset path escapes root: ${relative}`,
    )
  }

  if (
    !fs.existsSync(
      resolved,
    )
  ) {
    throw new Error(
      `Missing dataset file: ${resolved}`,
    )
  }

  return resolved
}


function fileReference(
  file: string,
  role:
    | "ART_DIRECTION"
    | "IDENTITY",
) {
  return {
    role,
    buffer:
      fs.readFileSync(
        file,
      ),
    mimeType:
      mimeFor(
        file,
      ),
    fileName:
      path.basename(
        file,
      ),
  }
}


function argValue(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index < 0 ||
    index + 1 >=
      process.argv.length
  ) {
    return null
  }

  return (
    process.argv[
      index + 1
    ] ??
    null
  )
}


const requestedCase =
  (
    argValue(
      "--case",
    ) ??
    "fit"
  ) as CaseName

if (
  !CASES.includes(
    requestedCase,
  )
) {
  throw new Error(
    `Invalid --case: ${requestedCase}`,
  )
}


const requestedVariants =
  (
    argValue(
      "--variants",
    ) ??
    "A,B,C"
  )
    .split(",")
    .map(
      (value) =>
        value
          .trim()
          .toUpperCase(),
    )
    .filter(Boolean) as Variant[]


for (
  const variant
  of requestedVariants
) {
  if (
    ![
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
    ].includes(
      variant,
    )
  ) {
    throw new Error(
      `Invalid variant: ${variant}`,
    )
  }
}


const usesFaceCropVariant =
  requestedVariants.includes(
    "D",
  ) ||
  requestedVariants.includes(
    "E",
  ) ||
  requestedVariants.includes(
    "F",
  )

const usesFullIdentityVariant =
  requestedVariants.includes(
    "G",
  ) ||
  requestedVariants.includes(
    "H",
  )

const usesHybridIdentityVariant =
  requestedVariants.includes(
    "I",
  )

if (
  (
    usesFaceCropVariant ||
    usesFullIdentityVariant ||
    usesHybridIdentityVariant
  ) &&
  requestedVariants.length !== 1
) {
  throw new Error(
    "Variants D/E/F/G/H/I must be run alone because they use dedicated identity-reference contracts.",
  )
}

if (
  usesFaceCropVariant &&
  manifest.identity.length !== 3
) {
  throw new Error(
    `Variants D/E/F expect exactly three FACE_ID crops; got ${manifest.identity.length}.`,
  )
}

if (
  !usesFaceCropVariant &&
  !usesFullIdentityVariant &&
  !usesHybridIdentityVariant &&
  manifest.identity.length !== 4
) {
  throw new Error(
    `Variants A/B/C expect exactly four identity images; got ${manifest.identity.length}.`,
  )
}

const repeatCount =
  Number(
    argValue(
      "--repeats",
    ) ??
    "1",
  )

if (
  !Number.isInteger(
    repeatCount,
  ) ||
  repeatCount < 1 ||
  repeatCount > 5
) {
  throw new Error(
    "--repeats must be an integer between 1 and 5.",
  )
}


const repeatStart =
  Number(
    argValue(
      "--repeat-start",
    ) ??
    "1",
  )

if (
  !Number.isInteger(
    repeatStart,
  ) ||
  repeatStart < 1 ||
  repeatStart > 5
) {
  throw new Error(
    "--repeat-start must be an integer between 1 and 5.",
  )
}

const repeatEnd =
  repeatStart +
  repeatCount -
  1

if (
  repeatEnd > 5
) {
  throw new Error(
    "--repeat-start + --repeats exceeds the maximum repeat index of 5.",
  )
}


const dryRun =
  process.argv.includes(
    "--dry-run",
  )



const OPENAI_ABC_MODEL =
  "gpt-image-2"

const OPENAI_ABC_SIZE =
  "1024x1536"

async function runOpenAiAbcImageGeneration(args: {
  prompt: string
  images: ReturnType<typeof fileReference>[]
}): Promise<{
  requestId: string
  image: Buffer
}> {
  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim()

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    )
  }

  const form =
    new FormData()

  form.append(
    "model",
    OPENAI_ABC_MODEL,
  )

  form.append(
    "prompt",
    args.prompt,
  )

  form.append(
    "size",
    OPENAI_ABC_SIZE,
  )

  form.append(
    "quality",
    "high",
  )

  form.append(
    "output_format",
    "png",
  )

  form.append(
    "moderation",
    "low",
  )

  for (const image of args.images) {
    if (
      !image.buffer ||
      !image.mimeType ||
      !image.fileName
    ) {
      throw new Error(
        "OpenAI QA image input is incomplete.",
      )
    }

    form.append(
      "image[]",
      new Blob(
        [
          new Uint8Array(
            image.buffer,
          ),
        ],
        {
          type:
            image.mimeType,
        },
      ),
      image.fileName,
    )
  }

  const response =
    await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },
        body: form,
        signal:
          AbortSignal.timeout(
            240000,
          ),
      },
    )

  const requestId =
    response.headers
      .get(
        "x-request-id",
      ) ??
    `openai-${crypto.randomUUID()}`

  const raw =
    await response.text()

  let payload: {
    data?: Array<{
      b64_json?: string
    }>
    error?: {
      message?: string
      code?: string
      type?: string
    }
  } = {}

  try {
    payload =
      raw
        ? JSON.parse(raw)
        : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    const providerMessage =
      payload.error
        ?.message ??
      raw.slice(0, 1000)

    throw new Error(
      [
        "OPENAI_IMAGE_EDIT_FAILED",
        String(
          response.status,
        ),
        providerMessage,
      ].join(
        " | ",
      ),
    )
  }

  const encoded =
    payload.data?.[0]
      ?.b64_json

  if (!encoded) {
    throw new Error(
      "OPENAI_IMAGE_EDIT_FAILED | missing b64_json",
    )
  }

  return {
    requestId,
    image:
      Buffer.from(
        encoded,
        "base64",
      ),
  }
}

async function main() {
  const providerExecutionAllowed =
    process.env
      .MIRAVA_KIE_ABC_EXECUTE
      ?.trim()
      .toLowerCase() ===
    "true"

  if (!providerExecutionAllowed) {
    throw new Error(
      "Provider execution disabled. Set MIRAVA_KIE_ABC_EXECUTE=true explicitly to run paid QA generation.",
    )
  }

  // MIRAVA_KIE_ABC_SEEDREAM_5_LITE
  if (
    requestedVariants.length === 1 &&
    (
      requestedVariants[0] === "F" ||
      requestedVariants[0] === "G"
    )
  ) {
    process.env.MIRAVA_KIE_IMAGE_MODEL =
      "seedream/5-lite-image-to-image"
  }

  // MIRAVA_KIE_ABC_GPT_IMAGE_2
  if (
    requestedVariants.length === 1 &&
    (
      requestedVariants[0] === "H" ||
      requestedVariants[0] === "I"
    )
  ) {
    process.env.MIRAVA_KIE_IMAGE_MODEL =
      "gpt-image-2-image-to-image"
  }



process.env.MIRAVA_KIE_IMAGE_POLL_WINDOW_MS =
  process.env
    .MIRAVA_KIE_ABC_POLL_WINDOW_MS
    ?.trim() ||
  "240000"

const {
  buildMiravaKieReferencePrompt,
  runKieImageGeneration,
} =
  await import(
    "../../src/lib/visual-engine/kie-provider"
  )

const {
  MIRAVA_KIE_IMAGE_MODEL,
} =
  await import(
    "../../src/lib/mirava/server-config"
  )

const {
  supabaseAdmin,
} =
  await import(
    "../../src/lib/supabase-admin"
  )


const qaStorageBucket =
  process.env
    .SUPABASE_STORAGE_VISUAL_ENGINE_BUCKET
    ?.trim() ||
  "visual-engine-private"

const QA_SIGNED_INPUT_TTL_SECONDS =
  60 * 60


if (
  !dryRun &&
  (
    !process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim() ||
    !process.env
      .SUPABASE_SERVICE_ROLE_KEY
      ?.trim()
  )
) {
  throw new Error(
    "Supabase admin storage is not configured.",
  )
}


async function createSignedQaReferences(
  images:
    ReturnType<
      typeof fileReference
    >[],
  storagePrefix: string,
) {
  const storagePaths:
    string[] = []

  const providerImages:
    Array<{
      role:
        | "ART_DIRECTION"
        | "IDENTITY"
      sourceUrl: string
      mimeType: string
      fileName: string
    }> = []

  try {
    for (
      const image
      of images
    ) {
      const safeFileName =
        image.fileName.replace(
          /[^A-Za-z0-9._-]/g,
          "_",
        )

      const storagePath =
        [
          storagePrefix,
          `${crypto.randomUUID()}-${safeFileName}`,
        ].join("/")

      const {
        error:
          uploadError,
      } =
        await supabaseAdmin
          .storage
          .from(
            qaStorageBucket,
          )
          .upload(
            storagePath,
            image.buffer,
            {
              contentType:
                image.mimeType,
              upsert:
                false,
            },
          )

      if (uploadError) {
        throw new Error(
          `QA Supabase upload failed: ${uploadError.message}`,
        )
      }

      storagePaths.push(
        storagePath,
      )

      const {
        data,
        error:
          signedUrlError,
      } =
        await supabaseAdmin
          .storage
          .from(
            qaStorageBucket,
          )
          .createSignedUrl(
            storagePath,
            QA_SIGNED_INPUT_TTL_SECONDS,
          )

      const sourceUrl =
        data
          ?.signedUrl
          ?.trim()

      if (
        signedUrlError ||
        !sourceUrl
      ) {
        throw new Error(
          `QA signed URL failed: ${
            signedUrlError
              ?.message ??
            "missing URL"
          }`,
        )
      }

      let parsed: URL

      try {
        parsed =
          new URL(
            sourceUrl,
          )
      } catch {
        throw new Error(
          "QA signed URL is invalid.",
        )
      }

      if (
        parsed.protocol !==
        "https:"
      ) {
        throw new Error(
          "QA signed URL must use HTTPS.",
        )
      }

      providerImages.push({
        role:
          image.role,
        sourceUrl,
        mimeType:
          image.mimeType,
        fileName:
          image.fileName,
      })
    }

    return {
      providerImages,
      storagePaths,
    }
  } catch (error) {
    if (
      storagePaths.length >
      0
    ) {
      const {
        error:
          cleanupError,
      } =
        await supabaseAdmin
          .storage
          .from(
            qaStorageBucket,
          )
          .remove(
            storagePaths,
          )

      if (cleanupError) {
        console.error(
          "[mirava-kie-abc-cleanup-error]",
          JSON.stringify({
            stage:
              "pre-generation",
            message:
              cleanupError.message,
            storagePathCount:
              storagePaths.length,
          }),
        )
      }
    }

    throw error
  }
}


async function cleanupSignedQaReferences(
  storagePaths:
    string[],
): Promise<void> {
  if (
    storagePaths.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabaseAdmin
      .storage
      .from(
        qaStorageBucket,
      )
      .remove(
        storagePaths,
      )

  if (error) {
    console.error(
      "[mirava-kie-abc-cleanup-error]",
      JSON.stringify({
        stage:
          "post-generation",
        message:
          error.message,
        storagePathCount:
          storagePaths.length,
      }),
    )

    return
  }

  console.log(
    [
      "SIGNED_INPUTS_CLEANED",
      `count=${storagePaths.length}`,
    ].join(" | "),
  )
}


if (
  !dryRun &&
  !process.env
    .KIE_API_KEY
    ?.trim()
) {
  throw new Error(
    "KIE_API_KEY is not configured.",
  )
}


const identityFiles =
  manifest.identity.map(
    absoluteDatasetFile,
  )


const fullIdentityFiles =
  [
    "id1.jpg",
    "id2.jpg",
    "id3.jpg",
    "id4.jpg",
  ].map(
    (fileName) =>
      path.join(
        datasetRoot,
        "normalized-identity",
        fileName,
      ),
  )

for (
  const fullIdentityFile
  of fullIdentityFiles
) {
  if (
    !fs.existsSync(
      fullIdentityFile,
    )
  ) {
    throw new Error(
      `Variant G identity file missing: ${fullIdentityFile}`,
    )
  }
}


const frontalIdentityCropFile =
  path.join(
    datasetRoot,
    "face-crops",
    "front.jpg",
  )

if (
  !fs.existsSync(
    frontalIdentityCropFile,
  )
) {
  throw new Error(
    `Variant I frontal FACE_ID crop missing: ${frontalIdentityCropFile}`,
  )
}


const artFile =
  absoluteDatasetFile(
    manifest.artDirection[
      requestedCase
    ],
  )


const maskedArtFile =
  path.join(
    datasetRoot,
    "masked-art-direction",
    `${requestedCase}.jpg`,
  )


const outputRoot =
  path.join(
    datasetRoot,
    "outputs",
    requestedCase,
  )


fs.mkdirSync(
  outputRoot,
  {
    recursive:
      true,
  },
)


console.log(
  [
    "MIRAVA KIE ABC QA",
    `dataset=${manifest.datasetName}`,
    `case=${requestedCase}`,
    `variants=${requestedVariants.join(",")}`,
    `repeats=${repeatCount}`,
    `model=${requestedVariants[0] === "E" ? OPENAI_ABC_MODEL : MIRAVA_KIE_IMAGE_MODEL}`,
    `identityCount=${requestedVariants[0] === "I" ? fullIdentityFiles.length + 1 : requestedVariants[0] === "G" || requestedVariants[0] === "H" ? fullIdentityFiles.length : identityFiles.length}`,
  ].join(" | "),
)


for (
  const variant
  of requestedVariants
) {
  if (
    variant === "B" &&
    !fs.existsSync(
      maskedArtFile,
    )
  ) {
    throw new Error(
      `Variant B requires masked art direction: ${maskedArtFile}`,
    )
  }

  for (
    let repeat = repeatStart;
    repeat <= repeatEnd;
    repeat += 1
  ) {
    const images =
      variant === "A"
        ? [
            fileReference(
              artFile,
              "ART_DIRECTION",
            ),
            ...identityFiles.map(
              (file) =>
                fileReference(
                  file,
                  "IDENTITY",
                ),
            ),
          ]
        : variant === "B"
          ? [
              fileReference(
                maskedArtFile,
                "ART_DIRECTION",
              ),
              ...identityFiles.map(
                (file) =>
                  fileReference(
                    file,
                    "IDENTITY",
                  ),
              ),
            ]
          : (
              variant === "G" ||
              variant === "H"
            )
            ? fullIdentityFiles.map(
                (file) =>
                  fileReference(
                    file,
                    "IDENTITY",
                  ),
              )
            : variant === "I"
              ? [
                  ...fullIdentityFiles.map(
                    (file) =>
                      fileReference(
                        file,
                        "IDENTITY",
                      ),
                  ),
                  fileReference(
                    frontalIdentityCropFile,
                    "IDENTITY",
                  ),
                ]
            : identityFiles.map(
                (file) =>
                  fileReference(
                    file,
                    "IDENTITY",
                  ),
              )


    const roles =
      images.map(
        (image) =>
          image.role,
      )


    const prompt =
      buildMiravaKieReferencePrompt({
        prompt:
          DIRECTIONS[
            requestedCase
          ],
        roles,
      })


    const runDirectory =
      path.join(
        outputRoot,
        variant,
        `run-${repeat}`,
      )


    fs.mkdirSync(
      runDirectory,
      {
        recursive:
          true,
      },
    )


    const requestArtifact = {
      schemaVersion:
        "mirava-kie-abc-request/v1",
      datasetName:
        manifest.datasetName,
      case:
        requestedCase,
      variant,
      repeat,
  model:
    variant === "E"
      ? OPENAI_ABC_MODEL
      : MIRAVA_KIE_IMAGE_MODEL,
      roles,
      inputCount:
        images.length,
      promptHash:
        `sha256:${sha256(prompt)}`,
      promptLength:
        prompt.length,
      inputDigests:
        images.map(
          (image) => ({
            role:
              image.role,
            fileName:
              image.fileName,
            sha256:
              `sha256:${sha256(
                image.buffer!,
              )}`,
          }),
        ),
    }


    fs.writeFileSync(
      path.join(
        runDirectory,
        "request.json",
      ),
      JSON.stringify(
        requestArtifact,
        null,
        2,
      ),
    )


    fs.writeFileSync(
      path.join(
        runDirectory,
        "prompt.txt",
      ),
      prompt,
    )


    console.log(
      [
        dryRun
          ? "DRY_RUN"
          : "START",
        `case=${requestedCase}`,
        `variant=${variant}`,
        `run=${repeat}`,
        `inputs=${images.length}`,
        `roles=${roles.join(",")}`,
        `promptHash=${requestArtifact.promptHash}`,
      ].join(" | "),
    )


    if (dryRun) {
      continue
    }


if (variant === "E") {
  const startedAt =
    Date.now()

  const result =
    await runOpenAiAbcImageGeneration({
      prompt,
      images,
    })

  const elapsedMs =
    Date.now() -
    startedAt

  const outputFile =
    path.join(
      runDirectory,
      "output.png",
    )

  fs.writeFileSync(
    outputFile,
    result.image,
  )

  fs.writeFileSync(
    path.join(
      runDirectory,
      "result.json",
    ),
    JSON.stringify(
      {
        schemaVersion:
          "mirava-kie-abc-result/v1",
        status: "SUCCESS",
        provider: "gpt-image-2",
        requestId:
          result.requestId,
        elapsedMs,
        outputFile:
          path.basename(
            outputFile,
          ),
        outputSha256:
          `sha256:${sha256(
            result.image,
          )}`,
      },
      null,
      2,
    ),
  )

  console.log(
    [
      "OPENAI_SUCCESS",
      `variant=${variant}`,
      "provider=gpt-image-2",
      `requestId=${result.requestId}`,
      `elapsedMs=${elapsedMs}`,
      `output=${outputFile}`,
    ].join(" | "),
  )

  continue
}

    const taskStateFile =
      path.join(
        runDirectory,
        "task.json",
      )

    let uploadedStoragePaths:
      string[] = []

    let activeTaskId:
      string | null = null

    let preserveSignedInputs =
      false

    let terminalTaskState =
      false

    try {
      let resumeTaskId:
        string | null = null

      let providerImages:
        Array<{
          role:
            | "ART_DIRECTION"
            | "IDENTITY"
          sourceUrl: string
          mimeType: string
          fileName: string
        }> = []

      if (
        fs.existsSync(
          taskStateFile,
        )
      ) {
        const existing =
          JSON.parse(
            fs.readFileSync(
              taskStateFile,
              "utf8",
            ),
          ) as {
            taskId?: unknown
            storagePaths?: unknown
          }

        if (
          typeof existing.taskId ===
            "string" &&
          existing.taskId.trim() &&
          Array.isArray(
            existing.storagePaths,
          ) &&
          existing.storagePaths.every(
            (value) =>
              typeof value ===
              "string",
          )
        ) {
          resumeTaskId =
            existing.taskId.trim()

          activeTaskId =
            resumeTaskId

          uploadedStoragePaths =
            existing.storagePaths

          console.log(
            [
              "RESUME_TASK",
              `variant=${variant}`,
              `run=${repeat}`,
              `taskId=${resumeTaskId}`,
              `retainedInputs=${uploadedStoragePaths.length}`,
            ].join(" | "),
          )
        } else {
          throw new Error(
            `Invalid QA task state: ${taskStateFile}`,
          )
        }
      }

      if (!resumeTaskId) {
        const storagePrefix =
          [
            "qa",
            "kie-identity-abc",
            manifest.datasetName
              .replace(
                /[^A-Za-z0-9._-]/g,
                "_",
              ),
            requestedCase,
            variant,
            `run-${repeat}`,
            crypto.randomUUID(),
          ].join("/")

        const signedReferences =
          await createSignedQaReferences(
            images,
            storagePrefix,
          )

        uploadedStoragePaths =
          signedReferences
            .storagePaths

        providerImages =
          signedReferences
            .providerImages

        console.log(
          [
            "SIGNED_INPUTS_READY",
            `variant=${variant}`,
            `run=${repeat}`,
            `count=${providerImages.length}`,
            `bucket=${qaStorageBucket}`,
          ].join(" | "),
        )
      }

      const startedAt =
        Date.now()

      const result =
        await runKieImageGeneration({
          prompt,
          images:
            resumeTaskId
              ? []
              : providerImages,
          aspectRatio:
            "2:3",
          resumeTaskId,
          onTaskCreated:
            async (
              taskId,
            ) => {
              activeTaskId =
                taskId

              fs.writeFileSync(
                taskStateFile,
                JSON.stringify(
                  {
                    schemaVersion:
                      "mirava-kie-abc-task/v1",
                    taskId,
                    case:
                      requestedCase,
                    variant,
                    repeat,
                    storagePaths:
                      uploadedStoragePaths,
                    createdAt:
                      new Date()
                        .toISOString(),
                  },
                  null,
                  2,
                ),
              )

              console.log(
                [
                  "TASK_CREATED",
                  `variant=${variant}`,
                  `run=${repeat}`,
                  `taskId=${taskId}`,
                ].join(" | "),
              )
            },
        })

      const elapsedMs =
        Date.now() -
        startedAt

      const ext =
        imageExtension(
          result.image,
        )

      const outputFile =
        path.join(
          runDirectory,
          `output${ext}`,
        )

      fs.writeFileSync(
        outputFile,
        result.image,
      )


      fs.writeFileSync(
        path.join(
          runDirectory,
          "result.json",
        ),
        JSON.stringify(
          {
            schemaVersion:
              "mirava-kie-abc-result/v1",
            status:
              "SUCCESS",
            taskId:
              result.taskId,
            elapsedMs,
            outputFile:
              path.basename(
                outputFile,
              ),
            outputSha256:
              `sha256:${sha256(
                result.image,
              )}`,
          },
          null,
          2,
        ),
      )


      console.log(
        [
          "SUCCESS",
          `variant=${variant}`,
          `run=${repeat}`,
          `taskId=${result.taskId}`,
          `elapsedMs=${elapsedMs}`,
          `output=${outputFile}`,
        ].join(" | "),
      )

      terminalTaskState =
        true
    } catch (error) {
      const details =
        error instanceof Error
          ? {
              name:
                error.name,
              message:
                error.message,
              code:
                "code" in error
                  ? String(
                      (
                        error as {
                          code?: unknown
                        }
                      ).code ??
                      "",
                    )
                  : "",
              kind:
                "kind" in error
                  ? String(
                      (
                        error as {
                          kind?: unknown
                        }
                      ).kind ??
                      "",
                    )
                  : "",
            }
          : {
              name:
                "UnknownError",
              message:
                String(
                  error,
                ),
              code:
                "",
              kind:
                "",
            }


      const timedOut =
        details.code ===
        "KIE_POLL_TIMEOUT"

      if (timedOut) {
        preserveSignedInputs =
          true

        fs.writeFileSync(
          path.join(
            runDirectory,
            "result.json",
          ),
          JSON.stringify(
            {
              schemaVersion:
                "mirava-kie-abc-result/v1",
              status:
                "PENDING",
              taskId:
                activeTaskId,
              ...details,
            },
            null,
            2,
          ),
        )

        console.error(
          [
            "PENDING",
            `variant=${variant}`,
            `run=${repeat}`,
            `taskId=${activeTaskId ?? "<UNKNOWN>"}`,
            `code=${details.code}`,
            "signedInputsRetained=true",
          ].join(" | "),
        )
      } else {
        terminalTaskState =
          true

        fs.writeFileSync(
          path.join(
            runDirectory,
            "result.json",
          ),
          JSON.stringify(
            {
              schemaVersion:
                "mirava-kie-abc-result/v1",
              status:
                "ERROR",
              taskId:
                activeTaskId,
              ...details,
            },
            null,
            2,
          ),
        )

        console.error(
          [
            "ERROR",
            `variant=${variant}`,
            `run=${repeat}`,
            `taskId=${activeTaskId ?? "<NONE>"}`,
            `code=${details.code}`,
            `kind=${details.kind}`,
            `message=${details.message}`,
          ].join(" | "),
        )
      }
    } finally {
      if (preserveSignedInputs) {
        console.log(
          [
            "SIGNED_INPUTS_RETAINED",
            `count=${uploadedStoragePaths.length}`,
            `taskId=${activeTaskId ?? "<UNKNOWN>"}`,
          ].join(" | "),
        )
      } else {
        await cleanupSignedQaReferences(
          uploadedStoragePaths,
        )

        if (
          terminalTaskState &&
          fs.existsSync(
            taskStateFile,
          )
        ) {
          fs.rmSync(
            taskStateFile,
          )
        }
      }
    }
  }
}


}

main().catch(
  (error) => {
    console.error(
      "MIRAVA_KIE_ABC_FAILED:",
      error instanceof Error
        ? (
            error.stack ??
            error.message
          )
        : String(error),
    )

    process.exitCode = 1
  },
)
