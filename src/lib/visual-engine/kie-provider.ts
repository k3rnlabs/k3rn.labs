import {
  MIRAVA_KIE_IMAGE_MODEL,
  MIRAVA_KIE_IMAGE_POLL_WINDOW_MS,
} from "@/lib/mirava/server-config"

const KIE_API_BASE =
  "https://api.kie.ai/api/v1"

const KIE_UPLOAD_BASE =
  "https://kieai.redpandaai.co"

const KIE_REQUEST_TIMEOUT_MS =
  30_000

export type MiravaKieImageRole =
  | "ART_DIRECTION"
  | "WARDROBE"
  | "CONTINUITY"
  | "IDENTITY"

export type MiravaKieReferenceImage = {
  role: MiravaKieImageRole

  /*
   * Preferred V6 transport:
   * short-lived HTTPS URL from private storage.
   */
  sourceUrl?: string

  /*
   * Compatibility transport for Session Builder,
   * diagnostics and legacy in-memory callers.
   */
  buffer?: Buffer
  mimeType?: string
  fileName?: string
}

export type KieProviderFailureKind =
  | "configuration"
  | "billing"
  | "rate_limit"
  | "transport"
  | "provider"
  | "safety"
  | "timeout"
  | "invalid_response"
  | "task_not_found"

export class KieProviderError extends Error {
  readonly code: string
  readonly kind: KieProviderFailureKind
  readonly retryable: boolean

  constructor(args: {
    message: string
    code: string
    kind: KieProviderFailureKind
    retryable: boolean
  }) {
    super(args.message)
    this.name = "KieProviderError"
    this.code = args.code
    this.kind = args.kind
    this.retryable = args.retryable
  }
}

type KieCreateTaskBody = {
  code?: number
  msg?: string
  data?: {
    taskId?: string
  }
}

type KieTaskData = {
  taskId?: string
  model?: string
  state?: string
  resultJson?: string | null
  failCode?: string | null
  failMsg?: string | null
  progress?: number | null
}

type KieTaskBody = {
  code?: number
  msg?: string
  data?: KieTaskData
}

type KieUploadBody = {
  success?: boolean
  code?: number
  msg?: string
  data?: {
    downloadUrl?: string
  }
}

export function parseKieUploadUrl(
  body: KieUploadBody,
): string {
  const message =
    body.msg?.trim() ?? ""

  const normalized =
    message.toLowerCase()

  if (
    body.success === false &&
    (
      normalized.includes(
        "free users can upload",
      ) ||
      normalized.includes(
        "upload quota",
      ) ||
      normalized.includes(
        "upload limit",
      )
    )
  ) {
    throw new KieProviderError({
      message:
        "Kie upload quota reached.",
      code:
        "KIE_UPLOAD_QUOTA",
      kind:
        "billing",
      retryable:
        false,
    })
  }

  if (
    body.success === false ||
    (
      typeof body.code === "number" &&
      body.code >= 400
    )
  ) {
    const retryable =
      typeof body.code === "number" &&
      (
        body.code === 429 ||
        body.code >= 500
      )

    throw new KieProviderError({
      message:
        message ||
        "Kie upload rejected.",
      code:
        typeof body.code === "number"
          ? `KIE_UPLOAD_${body.code}`
          : "KIE_UPLOAD_REJECTED",
      kind:
        body.code === 402
          ? "billing"
          : body.code === 429
            ? "rate_limit"
            : retryable
              ? "transport"
              : "provider",
      retryable,
    })
  }

  const url =
    body.data?.downloadUrl?.trim()

  if (!url) {
    throw new KieProviderError({
      message:
        "Kie upload did not return a download URL.",
      code:
        "KIE_UPLOAD_URL_MISSING",
      kind:
        "invalid_response",
      retryable:
        true,
    })
  }

  return url
}

function apiKey(): string {
  const key =
    process.env.KIE_API_KEY?.trim()

  if (!key) {
    throw new KieProviderError({
      message:
        "Kie image provider is not configured.",
      code: "KIE_CONFIGURATION",
      kind: "configuration",
      retryable: false,
    })
  }

  return key
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  )
}

function providerErrorFromHttp(
  status: number,
  body: string,
  prefix: string,
): KieProviderError {
  if (status === 401 || status === 403) {
    return new KieProviderError({
      message: `${prefix}: authentication failed`,
      code: `KIE_HTTP_${status}`,
      kind: "configuration",
      retryable: false,
    })
  }

  if (status === 402) {
    return new KieProviderError({
      message: `${prefix}: insufficient provider credit`,
      code: "KIE_BILLING",
      kind: "billing",
      retryable: false,
    })
  }

  if (status === 404) {
    return new KieProviderError({
      message: `${prefix}: task not found`,
      code: "KIE_TASK_NOT_FOUND",
      kind: "task_not_found",
      retryable: true,
    })
  }

  if (status === 429) {
    return new KieProviderError({
      message: `${prefix}: rate limited`,
      code: "KIE_RATE_LIMIT",
      kind: "rate_limit",
      retryable: true,
    })
  }

  return new KieProviderError({
    message:
      `${prefix}: HTTP ${status} ${body.slice(0, 600)}`,
    code: `KIE_HTTP_${status}`,
    kind:
      status >= 500
        ? "transport"
        : "provider",
    retryable:
      status >= 500,
  })
}

async function kieFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal:
        init.signal ??
        AbortSignal.timeout(
          KIE_REQUEST_TIMEOUT_MS,
        ),
    })
  } catch (error) {
    throw new KieProviderError({
      message:
        error instanceof Error
          ? error.message
          : "Kie transport failure",
      code: "KIE_TRANSPORT",
      kind: "transport",
      retryable: true,
    })
  }
}

async function uploadReference(
  image: MiravaKieReferenceImage,
): Promise<string> {
  if (
    !image.buffer ||
    !image.mimeType ||
    !image.fileName
  ) {
    throw new KieProviderError({
      message:
        "Kie input image has neither a direct URL nor complete upload data.",
      code:
        "KIE_INPUT_SOURCE_MISSING",
      kind:
        "configuration",
      retryable:
        false,
    })
  }

  const form = new FormData()

  form.append(
    "file",
    new Blob(
      [new Uint8Array(image.buffer)],
      {
        type: image.mimeType,
      },
    ),
    image.fileName,
  )

  form.append(
    "uploadPath",
    "mirava/provider-inputs",
  )

  form.append(
    "fileName",
    image.fileName,
  )

  const response =
    await kieFetch(
      `${KIE_UPLOAD_BASE}/api/file-stream-upload`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey()}`,
        },
        body: form,
      },
    )

  const text =
    await response.text()

  if (!response.ok) {
    throw providerErrorFromHttp(
      response.status,
      text,
      "Kie input upload failed",
    )
  }

  let body: KieUploadBody

  try {
    body =
      JSON.parse(text) as KieUploadBody
  } catch {
    throw new KieProviderError({
      message:
        "Kie upload returned invalid JSON.",
      code: "KIE_UPLOAD_INVALID_RESPONSE",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return parseKieUploadUrl(
    body,
  )
}

export function shouldRouteMiravaPromptToKie(
  prompt: string,
): boolean {
  return /\b(?:lingerie|intimate apparel|underwear|bra|bralette|briefs?|panties|corset)\b/i.test(
    prompt,
  )
}

function formatKieIndexes(
  indexes: number[],
): string {
  if (indexes.length === 1) {
    return `Image ${indexes[0]}`
  }

  return `Images ${indexes.join(", ")}`
}

export function buildMiravaKieReferencePrompt(args: {
  prompt: string
  roles: MiravaKieImageRole[]
  bodyIdentity?: string
}): string {
  const art: number[] = []
  const wardrobe: number[] = []
  const continuity: number[] = []
  const identity: number[] = []

  args.roles.forEach(
    (role, index) => {
      const number =
        index + 1

      if (
        role ===
        "ART_DIRECTION"
      ) {
        art.push(number)
      } else if (
        role ===
        "WARDROBE"
      ) {
        wardrobe.push(number)
      } else if (
        role ===
        "CONTINUITY"
      ) {
        continuity.push(number)
      } else {
        identity.push(number)
      }
    },
  )

  return [
    "REFERENCE ROLES — Follow these roles exactly.",

    ...(
      identity.length > 0
        ? [
            `${formatKieIndexes(identity)}: FACE IDENTITY AUTHORITY — sole authority for the generated person's identity at the face level: recognizable face, facial anatomy, skin identity, hairline and natural age. Preserve shared stable FACE_ID traits only. Never infer body morphology or copy pose, wardrobe, background or lighting.`,
          ]
        : []
    ),

    ...(
      art.length > 0
        ? [
            `${formatKieIndexes(art)}: ART DIRECTION ONLY — sole authority for camera, crop, perspective, pose skeleton, expression state, garment topology, hair styling, environment, lighting and finish. Never use this image as an identity source. Transfer ZERO facial anatomy or body morphology from this image.`,
          ]
        : []
    ),

    ...(
      wardrobe.length > 0
        ? [
            `${formatKieIndexes(wardrobe)}: WARDROBE ONLY — reproduce the attached garment or accessory faithfully, including visible colour, material and construction. Never use these images as identity sources and never derive face identity, body morphology, skin identity or distinguishing characteristics from them.`,
          ]
        : []
    ),

    ...(
      continuity.length > 0
        ? [
            `${formatKieIndexes(continuity)}: CONTINUITY ONLY — preserve the approved session environment, wardrobe, styling, materials, camera family, lighting and finish. Never override FACE_ID or BODY_ID authority.`,
          ]
        : []
    ),

    "IDENTITY CONSENSUS LOCK — Same FACE_ID person; no averaging or lookalike substitution. Preserve face width, jaw/chin, cheeks, eye shape/spacing, nose, lips, ears, skin, hairline and natural age.",

    ...(
      args.bodyIdentity?.trim()
        ? [
            "BODY MORPHOLOGY LOCK — BODY_ID below is the sole authority for intrinsic body morphology. Never derive body morphology from FACE_ID, ART_DIRECTION or WARDROBE images. BODY_ID must not alter ART_DIRECTION pose or camera.",
            args.bodyIdentity.trim(),
          ]
        : [
            "BODY MORPHOLOGY LOCK — No structured BODY_ID is available. Do not infer body morphology or natural proportions from FACE_ID, ART_DIRECTION or WARDROBE images. Do not intentionally redesign the model's body.",
          ]
    ),

    "EXPRESSION STATE ONLY — Transfer ART_DIRECTION head rotation, tilt, eyelid state, gaze and mouth pose onto FACE_ID anatomy.",

    "NO BEAUTIFICATION DRIFT — Preserve natural face geometry, natural age and asymmetry. Render photorealistic real skin with visible pores, fine microtexture and natural tonal variation. No painted skin, plastic skin, waxy skin, poreless airbrushing, beauty-filter smoothing or doll-like eyes; do not redesign eyes, nose or lips.",

    continuity.length > 0 &&
    art.length === 0
      ? "FIDELITY PRIORITY — CONTINUATION: FACE_ID remains authoritative for facial identity and BODY_ID for intrinsic morphology. Execute explicitly authorized continuation deltas before continuity preservation. CONTINUITY controls only dimensions that were not explicitly unlocked; never let the previous pose, framing or hairstyle cancel a requested change."
      : "FIDELITY PRIORITY — PASS A: first preserve ART_DIRECTION camera, crop, perspective, pose skeleton and garment topology exactly; second preserve FACE_ID face and BODY_ID morphology; third preserve remaining styling, environment and lighting. Never simplify or normalize the pose to improve identity.",

    "Create a realistic commercial adult fashion photograph. Keep private anatomy covered and do not introduce explicit sexual activity.",

    "VISUAL DIRECTION —",

    args.prompt,
  ].join("\n\n")
}

function looksLikeSafetyFailure(
  code: string,
  message: string,
): boolean {
  return /(?:nsfw|safety|sexual|explicit|content.?policy|moderation)/i.test(
    `${code} ${message}`,
  )
}

function parseResultUrls(
  resultJson: string | null | undefined,
): string[] {
  if (!resultJson) {
    return []
  }

  try {
    const parsed =
      JSON.parse(resultJson) as {
        resultUrls?: unknown
      }

    return Array.isArray(
      parsed.resultUrls,
    )
      ? parsed.resultUrls.filter(
          (value): value is string =>
            typeof value ===
              "string" &&
            value.length > 0,
        )
      : []
  } catch {
    return []
  }
}

export function buildMiravaKieIdentityRestorationPrompt(args: {
  identityCount: number
  bodyIdentity?: string
}): string {
  const identityIndexes =
    Array.from(
      {
        length:
          args.identityCount,
      },
      (_, index) =>
        index + 2,
    )

  return [
    "IDENTITY RESTORATION PASS — Identity-only correction of Image 1; no new composition.",

    "Image 1: TARGET FRAME AUTHORITY — freeze camera/crop/perspective, pose/limbs/hands, head orientation, expression/gaze/eyelid/mouth state, garment topology, architecture, lighting and finish.",

    `${formatKieIndexes(identityIndexes)}: FACE IDENTITY AUTHORITY — sole authority for face anatomy, skin identity, hairline/hair and natural age. Never infer body morphology or copy pose, expression, styling or scene.`,

    ...(
      args.bodyIdentity?.trim()
        ? [
            "BODY MORPHOLOGY LOCK — BODY_ID below is the sole authority for intrinsic body morphology. Correct visible drift only; never change Image 1 pose, camera, framing or garment topology.",
            args.bodyIdentity.trim(),
          ]
        : [
            "BODY MORPHOLOGY LOCK — No structured BODY_ID is available. Do not infer or invent body morphology from the FACE_ID portrait references.",
          ]
    ),

    "EDIT SCOPE — Restore FACE_ID in the existing target; BODY_ID may correct intrinsic morphology. Image 1 remains the same photograph.",

    "FACIAL GEOMETRY LOCK — FACE_ID controls face width/length, forehead, hairline, brows, cheeks, nose, philtrum, lips, jaw, chin and ears. Do not narrow, lengthen, widen or redesign the face.",

    "EYE GEOMETRY LOCK — FACE_ID controls intrinsic eye anatomy: shape, aperture ratio, upper/lower lid contours, inner/outer canthi and tilt, spacing, iris color/diameter relative to sclera, brow-eye distance and natural asymmetry. Never round/enlarge eyes, add sclera, enlarge iris/pupil or symmetrize. Keep Image 1 gaze/eyelid state; pupil size must remain plausible for its lighting. Makeup is surface-only; liner/lashes/shadow must not redefine eye anatomy.",

    "EXPRESSION LOCK — Preserve the exact expression state already present in Image 1. Keep target head tilt, gaze, eyelid state and mouth pose on FACE_ID anatomy; do not import neutral FACE_ID expression.",

    "HAIR IDENTITY — Keep Image 1 hair placement/movement with FACE_ID color, hairline, length and characteristic appearance.",

    "BODY CONSERVATION — Preserve Image 1 pose, perspective, limbs and body configuration. BODY_ID cannot change pose, camera, framing or garment topology. Never infer body proportions from FACE_ID portrait references.",

    "NO BEAUTIFICATION DRIFT — Preserve natural age, proportions, skin texture and asymmetry; no slimming, sharpening, standardization or doll-like eyes.",

    "ABSOLUTE SCENE FREEZE — Freeze architecture, garment topology, body pose, hand anchors, camera, framing, lighting, shadows and color treatment.",

    "OUTPUT — Return the same photorealistic fashion photograph with FACE_ID restored and only explicit BODY_ID morphology corrections. Keep private anatomy covered; no explicit sexual activity.",
  ].join("\n\n")
}

const SEEDREAM_PROMPT_MAX_CHARS =
  3000

function clipKieSection(
  value: string,
  maxChars: number,
): string {
  if (
    value.length <=
    maxChars
  ) {
    return value
  }

  const sliced =
    value.slice(
      0,
      Math.max(
        1,
        maxChars - 1,
      ),
    )

  const boundary =
    Math.max(
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("; "),
      sliced.lastIndexOf(", "),
    )

  const result =
    boundary >
      maxChars * 0.55
      ? sliced.slice(
          0,
          boundary + 1,
        )
      : sliced

  return `${result.trim()}…`
}

function seedreamSectionBudget(
  paragraph: string,
): number {
  if (
    /^SAFE REFERENCE DIRECTION/i.test(
      paragraph,
    )
  ) {
    return 500
  }

  if (
    /^POSE/i.test(
      paragraph,
    )
  ) {
    return 400
  }

  if (
    /^CAMERA(?: AND COMPOSITION)?/i.test(
      paragraph,
    )
  ) {
    return 420
  }

  if (
    /^WARDROBE/i.test(
      paragraph,
    )
  ) {
    return 400
  }

  if (
    /^HEAD AND EXPRESSION/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /^HAIR DIRECTION/i.test(
      paragraph,
    )
  ) {
    return 240
  }

  if (
    /^IDENTITY/i.test(
      paragraph,
    )
  ) {
    return 220
  }

  if (
    /^LIGHTING/i.test(
      paragraph,
    )
  ) {
    return 220
  }

  if (
    /^COMMERCIAL INTENT/i.test(
      paragraph,
    )
  ) {
    return 180
  }

  if (
    /^COLOR AND FINISH/i.test(
      paragraph,
    )
  ) {
    return 180
  }

  if (
    /^OUTPUT/i.test(
      paragraph,
    )
  ) {
    return 180
  }

  if (
    /^TRANSFER_MODE/i.test(
      paragraph,
    )
  ) {
    return 80
  }

  return 160
}

function seedreamProtectedSectionBudget(
  paragraph: string,
  continuation: {
    active: boolean
    poseUnlocked: boolean
    cameraUnlocked: boolean
  },
): number | null {
  /*
   * BODY_ID itself is handled separately and remains
   * complete. The caps below protect semantic contracts
   * while allowing verbose prose inside those contracts
   * to be shortened deterministically.
   */
  if (
    /^CLIENT DIRECTIVE:/i.test(
      paragraph,
    )
  ) {
    return 160
  }

  if (
    /^HAIR DELTA/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /^POSE DELTA AUTHORIZED/i.test(
      paragraph,
    )
  ) {
    return 280
  }

  if (
    /^CAMERA DELTA AUTHORIZED/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /^NO BEAUTIFICATION DRIFT/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /FACE IDENTITY AUTHORITY/i.test(
      paragraph,
    )
  ) {
    return 420
  }

  if (
    /^BODY MORPHOLOGY LOCK/i.test(
      paragraph,
    )
  ) {
    return 330
  }

  if (
    /TARGET FRAME AUTHORITY/i.test(
      paragraph,
    )
  ) {
    return 320
  }

  if (
    /^POSE —/i.test(
      paragraph,
    )
  ) {
    return continuation.poseUnlocked
      ? null
      : 560
  }

  if (
    /^CAMERA AND COMPOSITION —/i.test(
      paragraph,
    )
  ) {
    return continuation.cameraUnlocked
      ? null
      : 300
  }

  if (
    /ART DIRECTION ONLY/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /CONTINUITY ONLY/i.test(
      paragraph,
    )
  ) {
    return 260
  }

  if (
    /^IDENTITY RESTORATION PASS/i.test(
      paragraph,
    )
  ) {
    return 180
  }

  if (
    /^REFERENCE ROLES/i.test(
      paragraph,
    )
  ) {
    return 80
  }

  if (
    /^IDENTITY CONSENSUS LOCK/i.test(
      paragraph,
    )
  ) {
    return 260
  }

  if (
    /^FACIAL GEOMETRY LOCK/i.test(
      paragraph,
    )
  ) {
    return 220
  }

  if (
    /^EYE GEOMETRY LOCK/i.test(
      paragraph,
    )
  ) {
    return 560
  }

  if (
    /^EXPRESSION LOCK/i.test(
      paragraph,
    )
  ) {
    return 190
  }

  if (
    /^EDIT SCOPE/i.test(
      paragraph,
    )
  ) {
    return 260
  }

  if (
    /^BODY CONSERVATION/i.test(
      paragraph,
    )
  ) {
    return 360
  }

  if (
    /^ABSOLUTE SCENE FREEZE/i.test(
      paragraph,
    )
  ) {
    return 300
  }

  if (
    /^ENVIRONMENT/i.test(
      paragraph,
    )
  ) {
    return continuation.active
      ? 280
      : null
  }

  if (
    /^OUTPUT —/i.test(
      paragraph,
    )
  ) {
    return continuation.active
      ? 280
      : null
  }

  if (
    /^FIDELITY PRIORITY/i.test(
      paragraph,
    )
  ) {
    return 260
  }

  if (
    /^VISUAL DIRECTION —$/i.test(
      paragraph,
    )
  ) {
    return 80
  }

  if (
    /^Create a realistic commercial adult fashion photograph/i.test(
      paragraph,
    )
  ) {
    return 180
  }

  return null
}

function compactSeedreamPromptBySections(
  normalized: string,
): string {
  const paragraphs =
    normalized
      .split(
        /\n{2,}/,
      )
      .map(
        (value) =>
          value.trim(),
      )
      .filter(Boolean)

  const continuationActive =
    paragraphs.some(
      (paragraph) =>
        /CONTINUITY ONLY/i.test(
          paragraph,
        ),
    )

  const poseUnlocked =
    paragraphs.some(
      (paragraph) =>
        /^POSE DELTA AUTHORIZED/i.test(
          paragraph,
        ),
    )

  const cameraUnlocked =
    paragraphs.some(
      (paragraph) =>
        /^CAMERA DELTA AUTHORIZED/i.test(
          paragraph,
        ),
    )

  const hairUnlocked =
    paragraphs.some(
      (paragraph) =>
        /^HAIR DELTA/i.test(
          paragraph,
        ),
    )

  const entries =
    paragraphs.map(
      (
        paragraph,
        index,
      ) => {
        /*
         * The structured morphology paragraph is the
         * only section whose full content is itself an
         * identity invariant. Never partially preserve
         * BODY_ID.
         */
        const preserveComplete =
          /^INTRINSIC BODY IDENTITY/i.test(
            paragraph,
          )

        const protectedBudget =
          preserveComplete
            ? paragraph.length
            : seedreamProtectedSectionBudget(
                paragraph,
                {
                  active:
                    continuationActive,
                  poseUnlocked,
                  cameraUnlocked,
                },
              )

        const protectedSection =
          protectedBudget !==
          null

        const rendered =
          protectedSection
            ? (
                preserveComplete
                  ? paragraph
                  : clipKieSection(
                      paragraph,
                      protectedBudget!,
                    )
              )
            : ""

        const supersededByContinuation =
          (
            poseUnlocked &&
            /^POSE —/i.test(
              paragraph,
            )
          ) ||
          (
            cameraUnlocked &&
            /^CAMERA AND COMPOSITION —/i.test(
              paragraph,
            )
          ) ||
          (
            hairUnlocked &&
            /^HAIR DIRECTION/i.test(
              paragraph,
            )
          )

        return {
          index,
          paragraph,
          protectedSection,
          rendered,
          desiredBudget:
            protectedSection
              ? rendered.length
              : Math.min(
                  paragraph.length,
                  seedreamSectionBudget(
                    paragraph,
                  ),
                ),
          selected:
            !supersededByContinuation,
        }
      },
    )

  const protectedLength =
    entries.reduce(
      (
        sum,
        entry,
      ) =>
        sum +
        (
          entry.protectedSection
            ? entry.rendered.length
            : 0
        ),
      0,
    )

  /*
   * Start with every compactable paragraph selected.
   * If there is not even enough room for a minimal
   * representation of each one, drop the lowest-value
   * compactable paragraphs. Protected contracts are
   * never candidates for removal.
   */
  while (true) {
    const selected =
      entries.filter(
        (entry) =>
          entry.selected,
      )

    const flexible =
      selected.filter(
        (entry) =>
          !entry.protectedSection,
      )

    const separatorChars =
      Math.max(
        0,
        (
          selected.length -
          1
        ) * 2,
      )

    const availableFlexibleChars =
      SEEDREAM_PROMPT_MAX_CHARS -
      protectedLength -
      separatorChars

    const minimumFlexibleChars =
      flexible.reduce(
        (
          sum,
          entry,
        ) =>
          sum +
          Math.min(
            8,
            entry.paragraph.length,
          ),
        0,
      )

    if (
      availableFlexibleChars >=
      minimumFlexibleChars
    ) {
      break
    }

    const removable =
      flexible
        .slice()
        .sort(
          (
            left,
            right,
          ) =>
            left.desiredBudget -
              right.desiredBudget ||
            right.index -
              left.index,
        )[0]

    if (!removable) {
      throw new KieProviderError({
        message:
          `Seedream protected prompt sections exceed the ${SEEDREAM_PROMPT_MAX_CHARS}-character budget.`,
        code:
          "KIE_PROMPT_PROTECTED_OVERFLOW",
        kind:
          "configuration",
        retryable:
          false,
      })
    }

    removable.selected =
      false
  }

  const selected =
    entries.filter(
      (entry) =>
        entry.selected,
    )

  const flexible =
    selected.filter(
      (entry) =>
        !entry.protectedSection,
    )

  const separatorChars =
    Math.max(
      0,
      (
        selected.length -
        1
      ) * 2,
    )

  const flexibleBudget =
    SEEDREAM_PROMPT_MAX_CHARS -
    protectedLength -
    separatorChars

  const baseBudgets =
    flexible.map(
      (entry) =>
        Math.min(
          8,
          entry.paragraph.length,
        ),
    )

  const baseBudgetTotal =
    baseBudgets.reduce(
      (
        sum,
        value,
      ) =>
        sum + value,
      0,
    )

  const expandableBudget =
    Math.max(
      0,
      flexibleBudget -
      baseBudgetTotal,
    )

  const expansionWeights =
    flexible.map(
      (
        entry,
        index,
      ) =>
        Math.max(
          0,
          entry.desiredBudget -
          baseBudgets[index],
        ),
    )

  const totalExpansionWeight =
    expansionWeights.reduce(
      (
        sum,
        value,
      ) =>
        sum + value,
      0,
    )

  flexible.forEach(
    (
      entry,
      index,
    ) => {
      const base =
        baseBudgets[index]

      const extra =
        totalExpansionWeight > 0
          ? Math.floor(
              expandableBudget *
              (
                expansionWeights[
                  index
                ] /
                totalExpansionWeight
              ),
            )
          : 0

      const budget =
        Math.min(
          entry.desiredBudget,
          base + extra,
        )

      entry.rendered =
        clipKieSection(
          entry.paragraph,
          Math.max(
            1,
            budget,
          ),
        )
    },
  )

  const result =
    entries
      .filter(
        (entry) =>
          entry.selected,
      )
      .map(
        (entry) =>
          entry.rendered,
      )
      .filter(Boolean)
      .join("\n\n")

  if (
    result.length >
    SEEDREAM_PROMPT_MAX_CHARS
  ) {
    throw new KieProviderError({
      message:
        `Seedream section-aware compaction invariant failed: ${result.length} characters.`,
      code:
        "KIE_PROMPT_COMPACTION_OVERFLOW",
      kind:
        "configuration",
      retryable:
        false,
    })
  }

  return result
}

export function fitMiravaKiePromptForModel(
  model: string,
  prompt: string,
): string {
  const normalized =
    prompt
      .replace(
        /\r\n/g,
        "\n",
      )
      .replace(
        /[ \t]+/g,
        " ",
      )
      .replace(
        /\n{3,}/g,
        "\n\n",
      )
      .trim()

  if (
    model !==
      "seedream/4.5-edit" ||
    normalized.length <=
      SEEDREAM_PROMPT_MAX_CHARS
  ) {
    return normalized
  }

  return compactSeedreamPromptBySections(
    normalized,
  )
}

export function buildKieImageTaskInput(args: {
  model: string
  prompt: string
  inputUrls: string[]
}) {
  if (
    args.model ===
      "seedream/4.5-edit"
  ) {
    return {
      prompt:
        fitMiravaKiePromptForModel(
          args.model,
          args.prompt,
        ),
      image_urls:
        args.inputUrls,
      aspect_ratio:
        "2:3",

      /*
       * "basic" suffit pour le test de production initial
       * et évite de brûler inutilement les crédits.
       */
      quality:
        "basic",

      // Provider safety remains enabled.
      nsfw_checker:
        true,
    }
  }

  if (
    args.model.startsWith(
      "flux-2/",
    ) &&
    args.model.endsWith(
      "-image-to-image",
    )
  ) {
    return {
      input_urls:
        args.inputUrls,
      prompt:
        args.prompt,
      aspect_ratio:
        "2:3",
      resolution:
        "1K",

      // Provider safety remains enabled.
      nsfw_checker:
        true,
    }
  }

  throw new KieProviderError({
    message:
      `Unsupported MIRAVA Kie image model: ${args.model}`,
    code:
      "KIE_UNSUPPORTED_MODEL",
    kind:
      "configuration",
    retryable:
      false,
  })
}

export function parseKieCreateTaskId(
  body: KieCreateTaskBody,
): string {
  const taskId =
    body.data?.taskId?.trim()

  if (taskId) {
    return taskId
  }

  const providerCode =
    body.code

  const providerMessage =
    body.msg
      ?.trim()
      .slice(
        0,
        500,
      ) ?? ""

  const retryable =
    providerCode === 429 ||
    (
      typeof providerCode ===
        "number" &&
      providerCode >= 500
    )

  const kind:
    KieProviderFailureKind =
      providerCode === 401 ||
      providerCode === 403
        ? "configuration"
        : providerCode === 402
          ? "billing"
          : providerCode === 429
            ? "rate_limit"
            : typeof providerCode ===
                  "number" &&
                providerCode >= 500
              ? "transport"
              : "invalid_response"

  throw new KieProviderError({
    message:
      `Kie createTask rejected${
        providerCode !== undefined
          ? ` (code ${providerCode})`
          : ""
      }${
        providerMessage
          ? `: ${providerMessage}`
          : "."
      }`,
    code:
      providerCode !== undefined
        ? `KIE_CREATE_REJECTED_${providerCode}`
        : "KIE_TASK_ID_MISSING",
    kind,
    retryable,
  })
}

async function createTask(args: {
  prompt: string
  inputUrls: string[]
}): Promise<string> {
  const response =
    await kieFetch(
      `${KIE_API_BASE}/jobs/createTask`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey()}`,
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            model:
              MIRAVA_KIE_IMAGE_MODEL,
            input:
              buildKieImageTaskInput({
                model:
                  MIRAVA_KIE_IMAGE_MODEL,
                prompt:
                  args.prompt,
                inputUrls:
                  args.inputUrls,
              }),
          }),
      },
    )

  const text =
    await response.text()

  if (!response.ok) {
    throw providerErrorFromHttp(
      response.status,
      text,
      "Kie createTask failed",
    )
  }

  let body: KieCreateTaskBody

  try {
    body =
      JSON.parse(
        text,
      ) as KieCreateTaskBody
  } catch {
    throw new KieProviderError({
      message:
        "Kie createTask returned invalid JSON.",
      code: "KIE_CREATE_INVALID_RESPONSE",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return parseKieCreateTaskId(
    body,
  )
}

async function taskInfo(
  taskId: string,
): Promise<KieTaskData> {
  const response =
    await kieFetch(
      `${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${apiKey()}`,
        },
      },
    )

  const text =
    await response.text()

  if (!response.ok) {
    throw providerErrorFromHttp(
      response.status,
      text,
      "Kie recordInfo failed",
    )
  }

  let body: KieTaskBody

  try {
    body =
      JSON.parse(
        text,
      ) as KieTaskBody
  } catch {
    throw new KieProviderError({
      message:
        "Kie recordInfo returned invalid JSON.",
      code: "KIE_RECORD_INVALID_RESPONSE",
      kind: "invalid_response",
      retryable: true,
    })
  }

  if (!body.data) {
    throw new KieProviderError({
      message:
        "Kie recordInfo returned no task data.",
      code: "KIE_TASK_DATA_MISSING",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return body.data
}

async function downloadResult(
  resultUrl: string,
): Promise<Buffer> {
  const response =
    await kieFetch(
      resultUrl,
      {
        method: "GET",
      },
    )

  if (!response.ok) {
    const text =
      await response.text()

    throw providerErrorFromHttp(
      response.status,
      text,
      "Kie result download failed",
    )
  }

  const contentType =
    response.headers
      .get("content-type") ??
    ""

  if (
    contentType &&
    !contentType
      .toLowerCase()
      .startsWith("image/")
  ) {
    throw new KieProviderError({
      message:
        `Kie result is not an image (${contentType}).`,
      code: "KIE_RESULT_NOT_IMAGE",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return Buffer.from(
    await response.arrayBuffer(),
  )
}

export async function runKieImageGeneration(args: {
  prompt: string
  images: MiravaKieReferenceImage[]
  resumeTaskId?: string | null
  onTaskCreated?: (
    taskId: string,
  ) => Promise<void>
}): Promise<{
  taskId: string
  image: Buffer
}> {
  if (
    args.images.length === 0 &&
    !args.resumeTaskId
  ) {
    throw new KieProviderError({
      message:
        "Kie image-to-image requires at least one input image.",
      code: "KIE_INPUT_REQUIRED",
      kind: "invalid_response",
      retryable: false,
    })
  }

  if (args.images.length > 8) {
    throw new KieProviderError({
      message:
        "MIRAVA Kie image generation accepts at most eight input images.",
      code: "KIE_TOO_MANY_INPUTS",
      kind: "invalid_response",
      retryable: false,
    })
  }

  let taskId =
    args.resumeTaskId ??
    null

  if (!taskId) {
    const inputUrls =
      await Promise.all(
        args.images.map(
          async (image) => {
            const directUrl =
              image.sourceUrl?.trim()

            if (directUrl) {
              let parsed: URL

              try {
                parsed =
                  new URL(
                    directUrl,
                  )
              } catch {
                throw new KieProviderError({
                  message:
                    "Kie direct input URL is invalid.",
                  code:
                    "KIE_INPUT_URL_INVALID",
                  kind:
                    "configuration",
                  retryable:
                    false,
                })
              }

              if (
                parsed.protocol !==
                "https:"
              ) {
                throw new KieProviderError({
                  message:
                    "Kie direct input URL must use HTTPS.",
                  code:
                    "KIE_INPUT_URL_INVALID",
                  kind:
                    "configuration",
                  retryable:
                    false,
                })
              }

              return directUrl
            }

            /*
             * Compatibility fallback.
             * MIRAVA normally never reaches this branch
             * after the Supabase signed-URL migration.
             */
            return uploadReference(
              image,
            )
          },
        ),
      )

    taskId =
      await createTask({
        prompt: args.prompt,
        inputUrls,
      })

    await args.onTaskCreated?.(
      taskId,
    )
  }

  const startedAt =
    Date.now()

  let pollDelayMs =
    2_500

  while (
    Date.now() - startedAt <
    MIRAVA_KIE_IMAGE_POLL_WINDOW_MS
  ) {
    const info =
      await taskInfo(taskId)

    const state =
      (
        info.state ??
        ""
      ).toLowerCase()

    if (state === "success") {
      const resultUrls =
        parseResultUrls(
          info.resultJson,
        )

      const resultUrl =
        resultUrls[0]

      if (!resultUrl) {
        throw new KieProviderError({
          message:
            "Kie task succeeded without a result URL.",
          code: "KIE_RESULT_URL_MISSING",
          kind: "invalid_response",
          retryable: true,
        })
      }

      return {
        taskId,
        image:
          await downloadResult(
            resultUrl,
          ),
      }
    }

    if (state === "fail") {
      const failCode =
        info.failCode ?? ""
      const failMsg =
        info.failMsg ?? ""

      console.error(
        "[mirava-kie-task-fail]",
        JSON.stringify({
          taskId,
          model:
            MIRAVA_KIE_IMAGE_MODEL,
          failCode,
          failMsg:
            failMsg.slice(
              0,
              500,
            ),
        }),
      )

      const safety =
        looksLikeSafetyFailure(
          failCode,
          failMsg,
        )

      throw new KieProviderError({
        message:
          safety
            ? "Kie rejected the image task under its safety controls."
            : `Kie task failed: ${failCode} ${failMsg}`.trim(),
        code:
          safety
            ? "KIE_SAFETY_REFUSAL"
            : `KIE_TASK_FAILED${failCode ? `_${failCode}` : ""}`,
        kind:
          safety
            ? "safety"
            : "provider",
        retryable: false,
      })
    }

    await sleep(
      pollDelayMs,
    )

    pollDelayMs =
      Math.min(
        5_000,
        Math.round(
          pollDelayMs * 1.25,
        ),
      )
  }

  throw new KieProviderError({
    message:
      "Kie task is still running; resume the existing task on the next worker attempt.",
    code: "KIE_POLL_TIMEOUT",
    kind: "timeout",
    retryable: true,
  })
}
