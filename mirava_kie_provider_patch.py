#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from datetime import datetime
import re
import shutil

ROOT = Path.cwd()

CORE = ROOT / "src/lib/visual-engine/core.ts"
CONFIG = ROOT / "src/lib/mirava/server-config.ts"
SCHEMA = ROOT / "prisma/schema.prisma"
ENV_LOCAL = ROOT / ".env.local"
PROVIDER = ROOT / "src/lib/visual-engine/kie-provider.ts"
PROVIDER_TEST = ROOT / "src/lib/visual-engine/kie-provider.test.ts"
CORE_TEST = ROOT / "src/lib/visual-engine/core-kie-provider.test.ts"
MIGRATION = (
    ROOT
    / "prisma/migrations/20260807043000_mirava_kie_provider_state/migration.sql"
)

def fail(message: str) -> None:
    raise SystemExit(f"\nPATCH MIRAVA/KIE ABORTED\n{message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"Fichier introuvable: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")

def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source and old not in source:
        print(f"Déjà appliqué: {label}")
        return source
    count = source.count(old)
    if count != 1:
        fail(f"{label}: bloc attendu 1 fois, trouvé {count}")
    print(f"OK: {label}")
    return source.replace(old, new, 1)

for p in [CORE, CONFIG, SCHEMA]:
    read(p)

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path("/tmp") / f"mirava-kie-provider-{stamp}"
backup.mkdir(parents=True, exist_ok=False)

for p in [CORE, CONFIG, SCHEMA, ENV_LOCAL]:
    if p.exists():
        dst = backup / p.relative_to(ROOT)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)

print(f"Sauvegarde: {backup}")

# ---------------------------------------------------------------------------
# 1. Kie server config
# ---------------------------------------------------------------------------

config = read(CONFIG)

if "MIRAVA_KIE_IMAGE_MODEL" not in config:
    config = config.rstrip() + r'''

export const MIRAVA_KIE_IMAGE_MODEL =
  process.env.MIRAVA_KIE_IMAGE_MODEL ??
  "flux-2/pro-image-to-image"

export const MIRAVA_KIE_IMAGE_POLL_WINDOW_MS =
  Number(
    process.env.MIRAVA_KIE_IMAGE_POLL_WINDOW_MS ??
      "85000",
  )

export function isMiravaKieImageProviderEnabled(): boolean {
  const enabled =
    process.env.MIRAVA_KIE_IMAGE_PROVIDER_ENABLED ===
    "true"

  const configured =
    Boolean(
      process.env.KIE_API_KEY?.trim(),
    )

  /*
   * Kie receives private identity/reference images when this provider is used.
   * Local/dev can opt in immediately. Production remains fail-closed until
   * the privacy/consent disclosure for this external processor is shipped.
   */
  const productionDisclosureReady =
    process.env.NODE_ENV !== "production" ||
    process.env
      .MIRAVA_KIE_EXTERNAL_PROCESSING_DISCLOSED ===
      "true"

  return (
    enabled &&
    configured &&
    productionDisclosureReady
  )
}
''' + "\n"
    print("OK: config Kie")
else:
    print("Déjà appliqué: config Kie")

write(CONFIG, config)

# ---------------------------------------------------------------------------
# 2. Isolated Kie provider
# ---------------------------------------------------------------------------

provider_source = r'''import {
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

  const url =
    body.data?.downloadUrl

  if (!url) {
    throw new KieProviderError({
      message:
        "Kie upload did not return a download URL.",
      code: "KIE_UPLOAD_URL_MISSING",
      kind: "invalid_response",
      retryable: true,
    })
  }

  return url
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
            input: {
              input_urls:
                args.inputUrls,
              prompt: args.prompt,
              aspect_ratio: "2:3",
              resolution: "1K",

              // Deliberately kept enabled.
              nsfw_checker: true,
            },
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
        "Kie Flux 2 supports at most eight input images.",
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
'''

if PROVIDER.exists():
    existing = PROVIDER.read_text(encoding="utf-8")
    if existing != provider_source:
        fail(
            "src/lib/visual-engine/kie-provider.ts existe déjà avec un contenu différent."
        )
    print("Déjà appliqué: provider Kie")
else:
    write(PROVIDER, provider_source)
    print("OK: provider Kie")

# ---------------------------------------------------------------------------
# 3. StudioJob provider state for idempotent async resume
# ---------------------------------------------------------------------------

schema = read(SCHEMA)

if "providerTaskId" not in schema:
    pattern = re.compile(
        r'(model StudioJob \{.*?\n\s+lockedAt\s+DateTime\?\n\s+failureCode\s+String\?\n)',
        re.DOTALL,
    )
    match = pattern.search(schema)

    if not match:
        fail(
            "Bloc StudioJob introuvable pour ajouter l'état provider."
        )

    replacement = (
        match.group(1)
        + '  provider          String?\n'
        + '  providerTaskId    String?\n'
        + '  providerState     String?\n'
        + '  providerFrameIndex Int?\n'
    )

    schema = (
        schema[:match.start()]
        + replacement
        + schema[match.end():]
    )
    print("OK: champs provider StudioJob")
else:
    print("Déjà appliqué: champs provider StudioJob")

write(SCHEMA, schema)

migration_source = '''-- MIRAVA: resumable external image-provider task state.
ALTER TABLE "StudioJob"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerTaskId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerState" TEXT,
  ADD COLUMN IF NOT EXISTS "providerFrameIndex" INTEGER;
'''

if MIGRATION.exists():
    if MIGRATION.read_text(encoding="utf-8") != migration_source:
        fail(
            f"Migration existante différente: {MIGRATION.relative_to(ROOT)}"
        )
    print("Déjà appliqué: migration provider state")
else:
    write(MIGRATION, migration_source)
    print("OK: migration provider state")

# ---------------------------------------------------------------------------
# 4. Provider tests
# ---------------------------------------------------------------------------

provider_test_source = r'''import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"
import {
  buildMiravaKieReferencePrompt,
  shouldRouteMiravaPromptToKie,
} from "./kie-provider"

describe(
  "MIRAVA Kie image provider contracts",
  () => {
    it(
      "routes explicit intimate-fashion categories without over-routing ordinary fashion",
      () => {
        expect(
          shouldRouteMiravaPromptToKie(
            "Premium commercial lingerie campaign.",
          ),
        ).toBe(true)

        expect(
          shouldRouteMiravaPromptToKie(
            "Premium business portrait in a tailored blazer.",
          ),
        ).toBe(false)
      },
    )

    it(
      "keeps art direction and identity roles separated",
      () => {
        const prompt =
          buildMiravaKieReferencePrompt({
            prompt:
              "Create the approved fashion frame.",
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
          })

        expect(prompt).toContain(
          "ART DIRECTION ONLY",
        )
        expect(prompt).toContain(
          "Never use this image as an identity source",
        )
        expect(prompt).toContain(
          "IDENTITY AUTHORITY",
        )
        expect(prompt).toContain(
          "sole authority for the generated person's identity",
        )
      },
    )

    it(
      "keeps provider safety checking enabled",
      () => {
        const source =
          readFileSync(
            "src/lib/visual-engine/kie-provider.ts",
            "utf8",
          )

        expect(source).toContain(
          "nsfw_checker: true",
        )
        expect(source).not.toContain(
          "nsfw_checker: false",
        )
      },
    )

    it(
      "supports resumable asynchronous tasks",
      () => {
        const source =
          readFileSync(
            "src/lib/visual-engine/kie-provider.ts",
            "utf8",
          )

        expect(source).toContain(
          "resumeTaskId",
        )
        expect(source).toContain(
          "onTaskCreated",
        )
        expect(source).toContain(
          "/jobs/recordInfo",
        )
      },
    )
  },
)
'''

write(PROVIDER_TEST, provider_test_source)
print("OK: tests provider Kie")

# ---------------------------------------------------------------------------
# 5. Core imports
# ---------------------------------------------------------------------------

core = read(CORE)

if 'from "@/lib/visual-engine/kie-provider"' not in core:
    anchor = (
        'import { assertNoArtisticReferenceInGenerationPayload, '
        'assertAtLeastOneValidatedIdentityImage } '
        'from "@/lib/mirava/security/assert-image-role-separation"\n'
    )

    if anchor not in core:
        fail("Ancre imports sécurité introuvable dans core.ts")

    imports = r'''import {
  KieProviderError,
  buildMiravaKieReferencePrompt,
  runKieImageGeneration,
  shouldRouteMiravaPromptToKie,
  type MiravaKieReferenceImage,
} from "@/lib/visual-engine/kie-provider"
import {
  isMiravaKieImageProviderEnabled,
} from "@/lib/mirava/server-config"
'''

    core = core.replace(
        anchor,
        anchor + imports,
        1,
    )
    print("OK: imports Kie core")
else:
    print("Déjà appliqué: imports Kie core")

# ---------------------------------------------------------------------------
# 5B. Runtime StudioJobRecord fields (core uses a manual record type)
# ---------------------------------------------------------------------------

if "providerTaskId?: string | null" not in core:
    core = replace_once(
        core,
        '''  attempts: number
  nextRunAt: string
}
''',
        '''  attempts: number
  nextRunAt: string
  provider?: string | null
  providerTaskId?: string | null
  providerState?: string | null
  providerFrameIndex?: number | null
}
''',
        "type StudioJobRecord provider state",
    )
else:
    print("Déjà appliqué: type StudioJobRecord provider state")

# ---------------------------------------------------------------------------
# 6. Reference purge helper
# ---------------------------------------------------------------------------

if "async function purgeMiravaArtisticReferenceAssets" not in core:
    anchor = "async function getMiravaContinuityResultAsset(\n"

    if core.count(anchor) != 1:
        fail(
            "Ancre getMiravaContinuityResultAsset introuvable/ambiguë."
        )

    helper = r'''async function purgeMiravaArtisticReferenceAssets(
  creationId: string,
): Promise<void> {
  try {
    const references =
      await getStudioAssets(
        creationId,
        "REFERENCE",
      )

    if (
      references.length === 0
    ) {
      return
    }

    const {
      error:
        referencePurgeError,
    } =
      await supabaseAdmin.storage
        .from(STUDIO_BUCKET)
        .remove(
          references.map(
            (asset) =>
              asset.storagePath,
          ),
        )

    if (referencePurgeError) {
      throw referencePurgeError
    }

    const deletedAt =
      new Date()
        .toISOString()

    await Promise.all(
      references.map(
        (asset) =>
          db.studioAsset.update({
            where: {
              id: asset.id,
              creationId,
            },
            data: {
              deletedAt,
            },
          }),
      ),
    )
  } catch (error) {
    console.error(
      "[mirava-reference-purge-deferred]",
      JSON.stringify({
        creationId,
        sourceName:
          providerExceptionName(
            error,
          ),
        sourceMessage:
          providerExceptionMessage(
            error,
          ),
      }),
    )
  }
}

'''

    core = core.replace(
        anchor,
        helper + anchor,
        1,
    )
    print("OK: helper purge référence")
else:
    print("Déjà appliqué: helper purge référence")

# ---------------------------------------------------------------------------
# 7. Pass StudioJob into generateStudioImage for async-task persistence
# ---------------------------------------------------------------------------

if "studioJob: StudioJobRecord | null = null" not in core:
    core = replace_once(
        core,
        '''  physicalTraits: PhysicalTrait[] = [],
  jobAttempt = 1,
): Promise<Buffer> {
''',
        '''  physicalTraits: PhysicalTrait[] = [],
  jobAttempt = 1,
  studioJob: StudioJobRecord | null = null,
): Promise<Buffer> {
''',
        "signature generateStudioImage + StudioJob",
    )
else:
    print("Déjà appliqué: signature StudioJob")

# ---------------------------------------------------------------------------
# 8. Kie routing block after identity selection
# ---------------------------------------------------------------------------

identity_anchor = '''  const primaryIdentityAssets =
    isReferenceAnchor ||
    isContinuation
      ? selectMiravaPrimaryIdentityAssets(
          identityAssets,
        )
      : identityAssets

'''

if "const useKieCampaignProvider =" not in core:
    if core.count(identity_anchor) != 1:
        fail(
            "Bloc primaryIdentityAssets introuvable/ambigu."
        )

    route = r'''  const useKieCampaignProvider =
    isMiravaKieImageProviderEnabled() &&
    (
      campaignRisk
        .requiresCampaignSafeTransfer ||
      shouldRouteMiravaPromptToKie(
        primaryPrompt,
      )
    )

  const kieArtisticReference =
    useKieCampaignProvider &&
    !isContinuation
      ? (
          await getStudioAssets(
            creation.id,
            "REFERENCE",
          )
        )[0] ?? null
      : null

  const kieIdentityAssets =
    useKieCampaignProvider
      ? selectMiravaPrimaryIdentityAssets(
          identityAssets,
        )
      : []

  const clearKieTaskState =
    async (): Promise<void> => {
      if (!studioJob) {
        return
      }

      await db.studioJob.update({
        where: {
          id: studioJob.id,
        },
        data: {
          provider: null,
          providerTaskId: null,
          providerState: null,
          providerFrameIndex: null,
        },
      })
    }

  const executeKieCall =
    async (
      promptText: string,
      variant:
        | "campaign-safe-kie-primary"
        | "campaign-safe-kie-fallback",
      allowResume: boolean,
    ): Promise<Buffer> => {
      const startedAt =
        Date.now()

      const promptHash =
        createHash("sha256")
          .update(promptText)
          .digest("hex")
          .slice(0, 16)

      const references:
        MiravaKieReferenceImage[] =
        []

      if (kieArtisticReference) {
        references.push({
          role: "ART_DIRECTION",
          buffer:
            await downloadAsset(
              kieArtisticReference,
            ),
          mimeType:
            kieArtisticReference
              .mimeType,
          fileName:
            `art-direction-${kieArtisticReference.id}.${extensionForMime(kieArtisticReference.mimeType)}`,
        })
      }

      if (continuityAsset) {
        references.push({
          role: "CONTINUITY",
          buffer:
            await downloadAsset(
              continuityAsset,
            ),
          mimeType:
            continuityAsset
              .mimeType,
          fileName:
            `continuity-${continuityAsset.id}.${extensionForMime(continuityAsset.mimeType)}`,
        })
      }

      for (
        const asset of
        kieIdentityAssets
      ) {
        references.push({
          role: "IDENTITY",
          buffer:
            await downloadAsset(
              asset,
            ),
          mimeType:
            asset.mimeType,
          fileName:
            `identity-${asset.id}.${extensionForMime(asset.mimeType)}`,
        })
      }

      if (
        references.length > 8
      ) {
        references.splice(8)
      }

      const providerPrompt =
        buildMiravaKieReferencePrompt({
          prompt:
            promptText,
          roles:
            references.map(
              (reference) =>
                reference.role,
            ),
        })

      const resumeTaskId =
        allowResume &&
        studioJob?.provider ===
          "kie" &&
        studioJob
          .providerFrameIndex ===
          frameIndex
          ? studioJob
              .providerTaskId
          : null

      console.info(
        "[mirava-kie-image-attempt]",
        JSON.stringify({
          creationId:
            creation.id,
          frameIndex,
          shotIndex:
            creation.shotIndex ??
            0,
          variant,
          jobAttempt,
          promptHash,
          promptLength:
            providerPrompt.length,
          inputImageCount:
            references.length,
          artisticReferencePresent:
            Boolean(
              kieArtisticReference,
            ),
          continuityAssetPresent:
            Boolean(
              continuityAsset,
            ),
          resumeTask:
            Boolean(
              resumeTaskId,
            ),
        }),
      )

      try {
        const result =
          await runKieImageGeneration({
            prompt:
              providerPrompt,
            images:
              references,
            resumeTaskId,
            onTaskCreated:
              studioJob
                ? async (
                    taskId,
                  ) => {
                    await db
                      .studioJob
                      .update({
                        where: {
                          id:
                            studioJob.id,
                        },
                        data: {
                          provider:
                            "kie",
                          providerTaskId:
                            taskId,
                          providerState:
                            "submitted",
                          providerFrameIndex:
                            frameIndex,
                        },
                      })
                  }
                : undefined,
          })

        console.info(
          "[mirava-kie-image-success]",
          JSON.stringify({
            creationId:
              creation.id,
            frameIndex,
            variant,
            taskId:
              result.taskId,
            elapsedMs:
              Date.now() -
              startedAt,
          }),
        )

        return result.image
      } catch (error) {
        if (
          error instanceof
            KieProviderError
        ) {
          console.error(
            "[mirava-kie-image-error]",
            JSON.stringify({
              creationId:
                creation.id,
              frameIndex,
              variant,
              code:
                error.code,
              kind:
                error.kind,
              retryable:
                error.retryable,
              elapsedMs:
                Date.now() -
                startedAt,
            }),
          )

          if (
            error.kind ===
              "task_not_found"
          ) {
            await clearKieTaskState()
          }

          if (
            error.kind ===
              "safety"
          ) {
            throw new StudioError(
              "La génération n’a pas été autorisée par les règles de sécurité.",
              "SAFETY_REFUSAL",
            )
          }

          throw new StudioError(
            "Le moteur d’image alternatif est temporairement indisponible.",
            error.code,
            error.retryable,
          )
        }

        throw error
      }
    }

'''

    core = core.replace(
        identity_anchor,
        identity_anchor + route,
        1,
    )
    print("OK: routeur Kie")
else:
    print("Déjà appliqué: routeur Kie")

# ---------------------------------------------------------------------------
# 9. Kie is the primary provider for campaign-safe work when enabled.
# Existing OpenAI path remains the fallback architecture when Kie is disabled.
# ---------------------------------------------------------------------------

kie_first = r'''  if (useKieCampaignProvider) {
    try {
      return await executeKieCall(
        resolvedPrimaryPrompt,
        "campaign-safe-kie-primary",
        true,
      )
    } catch (error) {
      if (
        !(
          error instanceof
            StudioError
        ) ||
        error.code !==
          "SAFETY_REFUSAL"
      ) {
        throw error
      }

      await clearKieTaskState()

      return await executeKieCall(
        buildMiravaCampaignSafeTransferPrompt(
          primaryPrompt,
          "conservative",
        ),
        "campaign-safe-kie-fallback",
        false,
      )
    }
  }

'''

openai_anchor = '''  try {
    return await executeCall(
      resolvedPrimaryPrompt,
'''

if 'return await executeKieCall(\n        resolvedPrimaryPrompt' not in core:
    if core.count(openai_anchor) != 1:
        fail(
            "Ancre premier appel OpenAI introuvable/ambiguë."
        )

    core = core.replace(
        openai_anchor,
        kie_first + openai_anchor,
        1,
    )
    print("OK: Kie primary campaign route")
else:
    print("Déjà appliqué: Kie primary campaign route")

# ---------------------------------------------------------------------------
# 10. Worker passes job state and clears provider state only after result stored.
# ---------------------------------------------------------------------------

if '''        job.attempts + 1,
        job,
      )
''' not in core:
    core = replace_once(
        core,
        '''        job.attempts + 1,
      )
''',
        '''        job.attempts + 1,
        job,
      )
''',
        "passage StudioJob à generateStudioImage",
    )
else:
    print("Déjà appliqué: passage StudioJob")

if "providerTaskId: null" not in core[core.find("await storeResultAsset("):]:
    core = replace_once(
        core,
        '''      await storeResultAsset(
        creation,
        output,
      )

      const completedResultCount =
''',
        '''      await storeResultAsset(
        creation,
        output,
      )

      await db.studioJob.update({
        where: {
          id: job.id,
        },
        data: {
          provider: null,
          providerTaskId: null,
          providerState: null,
          providerFrameIndex: null,
        },
      })

      const completedResultCount =
''',
        "nettoyage provider après stockage",
    )
else:
    print("Déjà appliqué: nettoyage provider après stockage")

# ---------------------------------------------------------------------------
# 11. Retain artistic reference only when the Kie campaign route will use it.
# ---------------------------------------------------------------------------

if "const retainReferenceForKieGeneration =" not in core:
    marker = (
        "La référence artistique est purgée après que l'état métier est durable."
    )
    marker_index = core.find(marker)

    if marker_index >= 0:
        block_start = core.rfind(
            "      /*",
            0,
            marker_index,
        )
        block_end = core.find(
            '    } else if (job.kind === "GENERATE") {',
            marker_index,
        )

        if block_start < 0 or block_end < 0:
            fail(
                "Bloc de purge référence impossible à isoler."
            )

        replacement = r'''      const extractedCampaignRisk =
        detectMiravaCampaignRisk(
          extracted.masterPrompt,
        )

      const retainReferenceForKieGeneration =
        isMiravaKieImageProviderEnabled() &&
        (
          extractedCampaignRisk
            .requiresCampaignSafeTransfer ||
          shouldRouteMiravaPromptToKie(
            extracted.masterPrompt,
          )
        )

      if (
        retainReferenceForKieGeneration
      ) {
        console.info(
          "[mirava-reference-retained-for-kie-generation]",
          JSON.stringify({
            creationId:
              creation.id,
            referenceAssetId:
              reference.id,
          }),
        )
      } else {
        await purgeMiravaArtisticReferenceAssets(
          creation.id,
        )
      }
'''

        core = (
            core[:block_start]
            + replacement
            + core[block_end:]
        )
        print("OK: rétention référence conditionnelle")
    else:
        compact = '''      await supabaseAdmin.storage.from(STUDIO_BUCKET).remove([reference.storagePath])
      await db.studioAsset.update({ where: { id: reference.id, creationId: creation.id }, data: { deletedAt: new Date().toISOString() } })
'''
        replacement = '''      const extractedCampaignRisk =
        detectMiravaCampaignRisk(
          extracted.masterPrompt,
        )

      const retainReferenceForKieGeneration =
        isMiravaKieImageProviderEnabled() &&
        (
          extractedCampaignRisk
            .requiresCampaignSafeTransfer ||
          shouldRouteMiravaPromptToKie(
            extracted.masterPrompt,
          )
        )

      if (!retainReferenceForKieGeneration) {
        await purgeMiravaArtisticReferenceAssets(
          creation.id,
        )
      }
'''

        core = replace_once(
            core,
            compact,
            replacement,
            "rétention référence conditionnelle compacte",
        )
else:
    print("Déjà appliqué: rétention référence conditionnelle")

# ---------------------------------------------------------------------------
# 12. Purge artistic reference at successful completion.
# ---------------------------------------------------------------------------

early_old = '''        await db.studioCreation.update({ where: { id: creation.id }, data: { status: "COMPLETED", completedAt: creation.completedAt ?? new Date().toISOString() } })
        await finishJob(job)
'''

early_new = '''        await db.studioCreation.update({ where: { id: creation.id }, data: { status: "COMPLETED", completedAt: creation.completedAt ?? new Date().toISOString() } })
        await purgeMiravaArtisticReferenceAssets(
          creation.id,
        )
        await finishJob(job)
'''

if early_new not in core and early_old in core:
    core = core.replace(
        early_old,
        early_new,
        1,
    )
    print("OK: purge référence early complete")

completion_old = '''      await db.studioCreation.update({
        where: {
          id: creation.id,
        },
        data: {
          status: "COMPLETED",
          completedAt:
            new Date().toISOString(),
        },
      })

      void notifyMiravaCreationReady(
'''

completion_new = '''      await db.studioCreation.update({
        where: {
          id: creation.id,
        },
        data: {
          status: "COMPLETED",
          completedAt:
            new Date().toISOString(),
        },
      })

      await purgeMiravaArtisticReferenceAssets(
        creation.id,
      )

      void notifyMiravaCreationReady(
'''

if completion_new not in core:
    core = replace_once(
        core,
        completion_old,
        completion_new,
        "purge référence à la fin",
    )
else:
    print("Déjà appliqué: purge référence à la fin")

write(CORE, core)

# ---------------------------------------------------------------------------
# 13. Routing tests
# ---------------------------------------------------------------------------

core_test_source = r'''import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

const schema =
  readFileSync(
    "prisma/schema.prisma",
    "utf8",
  )

describe(
  "MIRAVA Kie routing contracts",
  () => {
    it(
      "routes campaign-safe work directly to Kie when enabled",
      () => {
        expect(core).toContain(
          "useKieCampaignProvider",
        )
        expect(core).toContain(
          "runKieImageGeneration",
        )
        expect(core).toContain(
          '"campaign-safe-kie-primary"',
        )
        expect(core).toContain(
          '"campaign-safe-kie-fallback"',
        )
      },
    )

    it(
      "persists provider task state for idempotent retries",
      () => {
        expect(schema).toContain(
          "providerTaskId",
        )
        expect(schema).toContain(
          "providerFrameIndex",
        )
        expect(core).toContain(
          "onTaskCreated:",
        )
        expect(core).toContain(
          "resumeTaskId:",
        )
      },
    )

    it(
      "retains the art-direction reference for Kie then purges it",
      () => {
        expect(core).toContain(
          "retainReferenceForKieGeneration",
        )
        expect(core).toContain(
          "purgeMiravaArtisticReferenceAssets",
        )
        expect(core).toContain(
          "[mirava-reference-retained-for-kie-generation]",
        )
      },
    )
  },
)
'''

write(CORE_TEST, core_test_source)
print("OK: tests routing Kie")

# ---------------------------------------------------------------------------
# 14. Local flags only. Existing KIE_API_KEY is never touched.
# ---------------------------------------------------------------------------

env_text = (
    ENV_LOCAL.read_text(encoding="utf-8")
    if ENV_LOCAL.exists()
    else ""
)

def ensure_env(text: str, key: str, value: str) -> str:
    pattern = re.compile(
        rf"^{re.escape(key)}=.*$",
        re.MULTILINE,
    )

    if pattern.search(text):
        return pattern.sub(
            f"{key}={value}",
            text,
            count=1,
        )

    if text and not text.endswith("\n"):
        text += "\n"

    return (
        text
        + f"{key}={value}\n"
    )

env_text = ensure_env(
    env_text,
    "MIRAVA_KIE_IMAGE_PROVIDER_ENABLED",
    "true",
)
env_text = ensure_env(
    env_text,
    "MIRAVA_KIE_IMAGE_MODEL",
    "flux-2/pro-image-to-image",
)
env_text = ensure_env(
    env_text,
    "MIRAVA_KIE_IMAGE_POLL_WINDOW_MS",
    "85000",
)

write(ENV_LOCAL, env_text)
print("OK: flags Kie .env.local (KIE_API_KEY inchangée)")

print("\nPATCH MIRAVA/KIE APPLIQUÉ")
print(f"Backup: {backup}")
print("\nProduction reste fail-closed tant que")
print("MIRAVA_KIE_EXTERNAL_PROCESSING_DISCLOSED=true")
print("n'est pas explicitement défini après mise à jour privacy/consent.")
