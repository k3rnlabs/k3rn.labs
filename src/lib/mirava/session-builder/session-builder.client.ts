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
import type {
  MiravaSessionBuilderV2Options,
} from "./session-options"
import {
  miravaSessionBuilderResumeStepSchema,
  type MiravaSessionBuilderResumeStep,
} from "./session-progress"
import {
  MIRAVA_SESSION_LOOK_CATEGORIES,
  MIRAVA_SESSION_LOOK_VIEW_KEYS,
  type MiravaSessionLookCategory,
  type MiravaSessionLookViewKey,
} from "./look"
import type {
  MiravaSessionLookClientItem,
} from "./session-look-upload.client"

export type MiravaSessionBuilderClientSession =
  Readonly<{
    id: string
    identityProfileId:
      | string
      | null
    config:
      MiravaSessionBuilderDraft
    lookItemCount: number
    lookItems?:
      MiravaSessionLookClientItem[]
    configurationReady: boolean
    resumeStep?:
      MiravaSessionBuilderResumeStep
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
    shotCount?:
      MiravaSessionBuilderV2Options[
        "shotCount"
      ]
    lookMode?:
      MiravaSessionLookMode
    framing?:
      MiravaSessionBuilderV2Options[
        "framing"
      ]
    pose?:
      MiravaSessionBuilderV2Options[
        "pose"
      ]
    expression?:
      MiravaSessionBuilderV2Options[
        "expression"
      ]
    gaze?:
      MiravaSessionBuilderV2Options[
        "gaze"
      ]
    makeup?:
      MiravaSessionBuilderV2Options[
        "makeup"
      ]
    skinFinish?:
      MiravaSessionBuilderV2Options[
        "skinFinish"
      ]
    hair?:
      MiravaSessionBuilderV2Options[
        "hair"
      ]
    userInstruction?:
      MiravaSessionBuilderV2Options[
        "userInstruction"
      ]
    resumeStep?:
      MiravaSessionBuilderResumeStep
  }>

type ApiPayload = {
  session?: unknown
  sessions?: unknown
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

function parseMiravaSessionLookItems(
  value: unknown,
): MiravaSessionLookClientItem[] {
  if (
    value ===
      undefined
  ) {
    return []
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
    )
  }

  return value.map(
    (
      item,
    ) => {
      if (
        typeof item !==
          "object" ||
        item === null ||
        Array.isArray(
          item,
        )
      ) {
        throw new Error(
          "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
        )
      }

      const record =
        item as
          Record<
            string,
            unknown
          >

      if (
        typeof record.id !==
          "string" ||
        !MIRAVA_SESSION_LOOK_CATEGORIES.includes(
          record.category as
            MiravaSessionLookCategory,
        ) ||
        !Number.isInteger(
          record.position,
        ) ||
        (
          record.label !==
            null &&
          typeof record.label !==
            "string"
        ) ||
        (
          record.brand !==
            null &&
          typeof record.brand !==
            "string"
        ) ||
        (
          record.description !==
            null &&
          typeof record.description !==
            "string"
        ) ||
        !Array.isArray(
          record.assets,
        )
      ) {
        throw new Error(
          "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
        )
      }

      const assets =
        record.assets.map(
          (
            asset,
          ) => {
            if (
              typeof asset !==
                "object" ||
              asset === null ||
              Array.isArray(
                asset,
              )
            ) {
              throw new Error(
                "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
              )
            }

            const assetRecord =
              asset as
                Record<
                  string,
                  unknown
                >

            if (
              "storagePath" in
                assetRecord ||
              typeof assetRecord.id !==
                "string" ||
              assetRecord.id.length <
                1 ||
              typeof assetRecord.mimeType !==
                "string" ||
              !Number.isInteger(
                assetRecord.bytes,
              ) ||
              (
                assetRecord.url !==
                  null &&
                typeof assetRecord.url !==
                  "string"
              ) ||
              !MIRAVA_SESSION_LOOK_VIEW_KEYS.includes(
                assetRecord.viewKey as
                  MiravaSessionLookViewKey,
              )
            ) {
              throw new Error(
                "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
              )
            }

            return {
              id:
                assetRecord.id,
              mimeType:
                assetRecord.mimeType,
              bytes:
                assetRecord.bytes as
                  number,
              viewKey:
                assetRecord.viewKey as
                  MiravaSessionLookViewKey,
              url:
                assetRecord.url as
                  string | null,
            }
          },
        )

      return {
        id:
          record.id,
        category:
          record.category as
            MiravaSessionLookCategory,
        label:
          record.label as
            string | null,
        brand:
          record.brand as
            string | null,
        description:
          record.description as
            string | null,
        position:
          record.position as
            number,
        assets,
      }
    },
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

  const resumeStep =
    value.resumeStep ===
      undefined
      ? null
      : miravaSessionBuilderResumeStepSchema
          .safeParse(
            value.resumeStep,
          )

  if (
    !config.success ||
    (
      resumeStep !== null &&
      !resumeStep.success
    ) ||
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
    ...(resumeStep?.success
      ? {
          resumeStep:
            resumeStep.data,
        }
      : {}),
    lookItemCount:
      value.lookItemCount,
    lookItems:
      parseMiravaSessionLookItems(
        value.lookItems,
      ),
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

export async function listMiravaSessionBuilderClientSessions():
Promise<
  MiravaSessionBuilderClientSession[]
> {
  const response =
    await fetch(
      endpoint(),
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
    !Array.isArray(
      payload.sessions,
    )
  ) {
    throw new Error(
      readError(
        payload,
        "MIRAVA_SESSION_LIST_FAILED",
      ),
    )
  }

  return payload.sessions.map(
    (
      session,
    ) =>
      parseMiravaSessionBuilderClientSession(
        session,
      ),
  )
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
