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
  | "CONTINUITY"
  | "IDENTITY"

export type MiravaKieReferenceImage = {
  role: MiravaKieImageRole
  buffer: Buffer
  mimeType: string
  fileName: string
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

export function buildMiravaKieReferencePrompt(args: {
  prompt: string
  roles: MiravaKieImageRole[]
}): string {
  const lines: string[] = [
    "MIRAVA REFERENCE ROLE CONTRACT — Follow the role of each attached image exactly.",
  ]

  args.roles.forEach(
    (role, index) => {
      const imageNumber =
        index + 1

      if (role === "ART_DIRECTION") {
        lines.push(
          `Image ${imageNumber}: ART DIRECTION ONLY. Transfer reusable scene, environment, pose geometry, camera height and angle, crop, perspective, lighting, wardrobe construction and photographic finish. Never use this image as an identity source and never copy the person's face or identity.`,
        )
      } else if (
        role === "CONTINUITY"
      ) {
        lines.push(
          `Image ${imageNumber}: CONTINUITY ONLY. Preserve the approved session's wardrobe, styling, environment, materials, lighting and photographic finish. Do not use this image as the identity authority when it conflicts with the identity references.`,
        )
      } else {
        lines.push(
          `Image ${imageNumber}: IDENTITY AUTHORITY. This image depicts the same consenting adult model as the other identity references. Preserve her recognizable face, facial geometry, natural age appearance, skin tone, hairline, body type and natural anatomical proportions.`,
        )
      }
    },
  )

  lines.push(
    "All IDENTITY AUTHORITY images together are the sole authority for the generated person's identity.",
    "The ART DIRECTION image, when present, controls photographic construction but never identity.",
    "Produce a realistic commercial adult fashion photograph. Keep private anatomy covered and do not introduce explicit sexual activity.",
    args.prompt,
  )

  return lines.join("\n\n")
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
        args.prompt,
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

  const taskId =
    body.data?.taskId

  if (!taskId) {
    throw new KieProviderError({
      message:
        "Kie createTask returned no taskId.",
      code: "KIE_TASK_ID_MISSING",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return taskId
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
          uploadReference,
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
