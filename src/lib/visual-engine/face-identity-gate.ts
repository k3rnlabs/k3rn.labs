const MIRAVA_FACE_IDENTITY_GATE_SCHEMA =
  "mirava-face-identity-gate/v3" as const

const DEFAULT_FACE_IDENTITY_GATE_TIMEOUT_MS =
  30_000

const MAX_FACE_IDENTITY_GATE_IMAGE_BYTES =
  10 * 1024 * 1024

export type MiravaFaceIdentityGateDecision =
  | "PASS"
  | "FAIL"
  | "UNSCORABLE"

export type MiravaFaceIdentityGateResult = {
  schemaVersion:
    typeof MIRAVA_FACE_IDENTITY_GATE_SCHEMA
  decision:
    MiravaFaceIdentityGateDecision
  reasonCode: string
  aggregateSimilarity:
    number | null
  threshold:
    number | null
  landmarkResidual:
    number | null
  landmarkThreshold:
    number | null
  perReferenceSimilarity:
    number[]
  evaluator: {
    name: string
    version: string
    weightsDigest: string
    preprocessingVersion: string
    calibrationVersion: string
    calibrationDigest: string
    calibrationStatus:
      | "PASS"
      | "FAIL"
  }
  candidateFace: {
    count: number
    confidence: number | null
    box: {
      left: number
      top: number
      width: number
      height: number
    } | null
    yaw: number | null
    pitch: number | null
    roll: number | null
  }
}

export class MiravaFaceIdentityGateError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(args: {
    message: string
    code: string
    retryable: boolean
  }) {
    super(args.message)
    this.name =
      "MiravaFaceIdentityGateError"
    this.code =
      args.code
    this.retryable =
      args.retryable
  }
}

type GateImage = {
  buffer: Buffer
  mimeType: string
  fileName: string
}

function requiredGateConfiguration(): {
  endpoint: string
  token: string
} {
  const endpoint =
    process.env
      .MIRAVA_FACE_IDENTITY_GATE_URL
      ?.trim()
  const token =
    process.env
      .MIRAVA_FACE_IDENTITY_GATE_TOKEN
      ?.trim()

  if (!endpoint || !token) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate is not configured.",
      code:
        "FACE_IDENTITY_GATE_CONFIGURATION",
      retryable:
        false,
    })
  }

  let parsed: URL

  try {
    parsed =
      new URL(endpoint)
  } catch {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate URL is invalid.",
      code:
        "FACE_IDENTITY_GATE_CONFIGURATION",
      retryable:
        false,
    })
  }

  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      (
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost"
      )
    )
  ) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate must use HTTPS outside localhost.",
      code:
        "FACE_IDENTITY_GATE_CONFIGURATION",
      retryable:
        false,
    })
  }

  return {
    endpoint:
      new URL(
        "/v1/evaluate",
        parsed,
      ).toString(),
    token,
  }
}

function appendImage(
  form: FormData,
  field: string,
  image: GateImage,
): void {
  if (
    image.buffer.length === 0 ||
    image.buffer.length >
      MAX_FACE_IDENTITY_GATE_IMAGE_BYTES
  ) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate received an invalid image size.",
      code:
        "FACE_IDENTITY_GATE_INVALID_INPUT",
      retryable:
        false,
    })
  }

  if (
    !image.mimeType.startsWith(
      "image/",
    )
  ) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate received an invalid media type.",
      code:
        "FACE_IDENTITY_GATE_INVALID_INPUT",
      retryable:
        false,
    })
  }

  form.append(
    field,
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

function finiteUnitNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -1 &&
    value <= 1
  )
}

function finiteNullableNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value)
    )
  )
}

function finiteUnitNullableNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    finiteUnitNumber(value)
  )
}

function finiteNonNegativeNullableNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    )
  )
}

function validSha256Digest(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^sha256:[0-9a-f]{64}$/.test(
      value,
    )
  )
}

function containsEmbeddingField(
  value: unknown,
): boolean {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false
  }

  if (Array.isArray(value)) {
    return value.some(
      containsEmbeddingField,
    )
  }

  return Object.entries(
    value as Record<string, unknown>,
  ).some(
    ([key, nestedValue]) =>
      key.toLowerCase()
        .includes("embedding") ||
      containsEmbeddingField(
        nestedValue,
      ),
  )
}

function parseGateResult(
  value: unknown,
): MiravaFaceIdentityGateResult {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate returned invalid JSON.",
      code:
        "FACE_IDENTITY_GATE_INVALID_RESPONSE",
      retryable:
        true,
    })
  }

  const result =
    value as Record<string, unknown>
  const evaluator =
    result.evaluator as
      | Record<string, unknown>
      | undefined
  const candidateFace =
    result.candidateFace as
      | Record<string, unknown>
      | undefined
  const box =
    candidateFace?.box as
      | Record<string, unknown>
      | null
      | undefined

  const decision =
    result.decision
  const validDecision =
    decision === "PASS" ||
    decision === "FAIL" ||
    decision === "UNSCORABLE"
  const similarities =
    result.perReferenceSimilarity

  const validBox =
    box === null ||
    (
      box !== undefined &&
      [
        box.left,
        box.top,
        box.width,
        box.height,
      ].every(
        (entry) =>
          typeof entry === "number" &&
          Number.isFinite(entry) &&
          entry >= 0,
      )
    )

  if (
    containsEmbeddingField(result) ||
    result.schemaVersion !==
      MIRAVA_FACE_IDENTITY_GATE_SCHEMA ||
    !validDecision ||
    typeof result.reasonCode !== "string" ||
    !finiteUnitNullableNumber(
      result.aggregateSimilarity,
    ) ||
    !finiteUnitNullableNumber(
      result.threshold,
    ) ||
    !finiteNonNegativeNullableNumber(
      result.landmarkResidual,
    ) ||
    !finiteNonNegativeNullableNumber(
      result.landmarkThreshold,
    ) ||
    !Array.isArray(similarities) ||
    !similarities.every(
      finiteUnitNumber,
    ) ||
    !evaluator ||
    [
      evaluator.name,
      evaluator.version,
      evaluator.preprocessingVersion,
      evaluator.calibrationVersion,
    ].some(
      (entry) =>
        typeof entry !== "string" ||
        entry.length === 0,
    ) ||
    !validSha256Digest(
      evaluator.weightsDigest,
    ) ||
    !validSha256Digest(
      evaluator.calibrationDigest,
    ) ||
    (
      evaluator.calibrationStatus !== "PASS" &&
      evaluator.calibrationStatus !== "FAIL"
    ) ||
    (
      evaluator.calibrationStatus !== "PASS" &&
      decision === "PASS"
    ) ||
    !candidateFace ||
    typeof candidateFace.count !== "number" ||
    !Number.isInteger(candidateFace.count) ||
    candidateFace.count < 0 ||
    !finiteNullableNumber(
      candidateFace.confidence,
    ) ||
    !validBox ||
    !finiteNullableNumber(
      candidateFace.yaw,
    ) ||
    !finiteNullableNumber(
      candidateFace.pitch,
    ) ||
    !finiteNullableNumber(
      candidateFace.roll,
    )
  ) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate response violates the v3 contract.",
      code:
        "FACE_IDENTITY_GATE_INVALID_RESPONSE",
      retryable:
        true,
    })
  }

  return value as
    MiravaFaceIdentityGateResult
}

export async function evaluateMiravaFaceIdentity(
  args: {
    candidate: GateImage
    references: [
      GateImage,
      GateImage,
      GateImage,
      ...GateImage[],
    ]
    identityManifestVersion: string
    requestId: string
    timeoutMs?: number
    fetchImpl?: typeof fetch
  },
): Promise<MiravaFaceIdentityGateResult> {
  const configuration =
    requiredGateConfiguration()
  const form =
    new FormData()

  appendImage(
    form,
    "candidate",
    args.candidate,
  )

  for (const reference of args.references) {
    appendImage(
      form,
      "references",
      reference,
    )
  }

  form.set(
    "identityManifestVersion",
    args.identityManifestVersion,
  )
  form.set(
    "requestId",
    args.requestId,
  )

  const fetchImpl =
    args.fetchImpl ?? fetch
  let response: Response

  try {
    response =
      await fetchImpl(
        configuration.endpoint,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${configuration.token}`,
          },
          body: form,
          signal:
            AbortSignal.timeout(
              args.timeoutMs ??
                DEFAULT_FACE_IDENTITY_GATE_TIMEOUT_MS,
            ),
        },
      )
  } catch (error) {
    throw new MiravaFaceIdentityGateError({
      message:
        error instanceof Error
          ? error.message
          : "MIRAVA face identity gate transport failed.",
      code:
        "FACE_IDENTITY_GATE_TRANSPORT",
      retryable:
        true,
    })
  }

  if (!response.ok) {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate rejected the request.",
      code:
        `FACE_IDENTITY_GATE_HTTP_${response.status}`,
      retryable:
        response.status === 429 ||
        response.status >= 500,
    })
  }

  let body: unknown

  try {
    body =
      await response.json()
  } catch {
    throw new MiravaFaceIdentityGateError({
      message:
        "MIRAVA face identity gate returned invalid JSON.",
      code:
        "FACE_IDENTITY_GATE_INVALID_RESPONSE",
      retryable:
        true,
    })
  }

  return parseGateResult(body)
}
