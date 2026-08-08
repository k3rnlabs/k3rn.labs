"use client"

import {
  miravaSessionBuilderDraftSchema,
  type MiravaSessionBuilderDraft,
  type MiravaSessionLookMode,
} from "./schema"
import {
  type MiravaLightingPresetId,
} from "./lighting-presets"
import {
  type MiravaSetPresetId,
} from "./set-presets"

export type MiravaSessionBuilderClientSession =
  Readonly<{
    id: string
    identityProfileId:
      | string
      | null
    config:
      MiravaSessionBuilderDraft
    lookItemCount: number
    configurationReady: boolean
    createdAt: string
    updatedAt: string
  }>

export type MiravaSessionBuilderClientPatch =
  Readonly<{
    setPresetId?:
      | MiravaSetPresetId
      | null
    lightingPresetId?:
      | MiravaLightingPresetId
      | null
    lookMode?:
      MiravaSessionLookMode
  }>

type ApiPayload = {
  session?: unknown
  error?: unknown
  message?: unknown
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

export function parseMiravaSessionBuilderClientSession(
  value: unknown,
): MiravaSessionBuilderClientSession {
  if (!isRecord(value)) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
    )
  }

  const config =
    miravaSessionBuilderDraftSchema
      .safeParse(
        value.config,
      )

  if (
    !config.success ||
    typeof value.id !==
      "string" ||
    value.id.length < 1 ||
    (
      value.identityProfileId !==
        null &&
      typeof value.identityProfileId !==
        "string"
    ) ||
    typeof value.lookItemCount !==
      "number" ||
    !Number.isInteger(
      value.lookItemCount,
    ) ||
    value.lookItemCount < 0 ||
    typeof value.configurationReady !==
      "boolean" ||
    typeof value.createdAt !==
      "string" ||
    typeof value.updatedAt !==
      "string"
  ) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
    )
  }

  return {
    id:
      value.id,
    identityProfileId:
      value.identityProfileId,
    config:
      config.data,
    lookItemCount:
      value.lookItemCount,
    configurationReady:
      value.configurationReady,
    createdAt:
      value.createdAt,
    updatedAt:
      value.updatedAt,
  }
}

function endpoint(
  sessionId?: string,
): string {
  if (!sessionId) {
    return (
      "/api/visual-engine/sessions"
    )
  }

  return (
    "/api/visual-engine/sessions/" +
    encodeURIComponent(
      sessionId,
    )
  )
}

async function readPayload(
  response: Response,
): Promise<ApiPayload> {
  return await response
    .json()
    .catch(
      () => ({}),
    ) as ApiPayload
}

function readError(
  payload: ApiPayload,
  fallback: string,
): string {
  if (
    typeof payload.error ===
      "string" &&
    payload.error.length > 0
  ) {
    return payload.error
  }

  if (
    typeof payload.message ===
      "string" &&
    payload.message.length > 0
  ) {
    return payload.message
  }

  return fallback
}

export async function createMiravaSessionBuilderClientSession():
Promise<
  MiravaSessionBuilderClientSession
> {
  const response =
    await fetch(
      endpoint(),
      {
        method:
          "POST",
      },
    )

  const payload =
    await readPayload(
      response,
    )

  if (
    !response.ok ||
    !payload.session
  ) {
    throw new Error(
      readError(
        payload,
        "MIRAVA_SESSION_CREATE_FAILED",
      ),
    )
  }

  return parseMiravaSessionBuilderClientSession(
    payload.session,
  )
}

export async function getMiravaSessionBuilderClientSession(
  sessionId: string,
): Promise<
  MiravaSessionBuilderClientSession
> {
  if (
    typeof sessionId !==
      "string" ||
    sessionId.trim().length <
      1
  ) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_INVALID_ID",
    )
  }

  const response =
    await fetch(
      endpoint(
        sessionId,
      ),
      {
        method:
          "GET",
      },
    )

  const payload =
    await readPayload(
      response,
    )

  if (
    !response.ok ||
    !payload.session
  ) {
    throw new Error(
      readError(
        payload,
        "MIRAVA_SESSION_LOAD_FAILED",
      ),
    )
  }

  return parseMiravaSessionBuilderClientSession(
    payload.session,
  )
}

export async function patchMiravaSessionBuilderClientSession(
  sessionId: string,
  patch:
    MiravaSessionBuilderClientPatch,
): Promise<
  MiravaSessionBuilderClientSession
> {
  if (
    typeof sessionId !==
      "string" ||
    sessionId.trim().length <
      1
  ) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_INVALID_ID",
    )
  }

  if (
    Object.keys(
      patch,
    ).length < 1
  ) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_EMPTY_PATCH",
    )
  }

  const response =
    await fetch(
      endpoint(
        sessionId,
      ),
      {
        method:
          "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify(
            patch,
          ),
      },
    )

  const payload =
    await readPayload(
      response,
    )

  if (
    !response.ok ||
    !payload.session
  ) {
    throw new Error(
      readError(
        payload,
        "MIRAVA_SESSION_PATCH_FAILED",
      ),
    )
  }

  return parseMiravaSessionBuilderClientSession(
    payload.session,
  )
}
