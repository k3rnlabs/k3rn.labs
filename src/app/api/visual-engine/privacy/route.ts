import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { validateBody } from "@/lib/validate"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
  withMiravaPrivateHeaders,
} from "@/lib/visual-engine/http"
import {
  acceptMiravaExternalImageGenerationConsent,
  acceptMiravaOpenAiIdentityAnalysisConsent,
  acceptMiravaRequiredConsents,
  getMiravaPrivacyStatus,
  setMiravaAnalyticsDecision,
} from "@/lib/visual-engine/privacy"

const localeSchema =
  z.enum(["fr", "es"])

const mutationSchema =
  z.discriminatedUnion(
    "action",
    [
      z.object({
        action:
          z.literal(
            "accept_required",
          ),
        termsAccepted:
          z.literal(true),
        identityProcessingAccepted:
          z.literal(true),
        locale:
          localeSchema,
      }),
      z.object({
        action:
          z.literal(
            "accept_openai_identity_analysis",
          ),
        disclosureAccepted:
          z.literal(true),
        locale:
          localeSchema,
      }),
      z.object({
        action:
          z.literal(
            "accept_external_image_generation",
          ),
        disclosureAccepted:
          z.literal(true),
        locale:
          localeSchema,
      }),
      z.object({
        action:
          z.literal(
            "set_analytics",
          ),
        accepted:
          z.boolean(),
        locale:
          localeSchema,
      }),
    ],
  )

export async function GET() {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  return apiSuccess({
    privacy:
      await getMiravaPrivacyStatus(
        session.userId,
      ),
  })
}

export async function PATCH(
  req: NextRequest,
) {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  const result =
    await validateBody(
      mutationSchema,
      req,
    )

  if ("error" in result) {
    return withMiravaPrivateHeaders(
      result.error,
    )
  }

  let privacy

  if (
    result.data.action ===
    "accept_required"
  ) {
    privacy =
      await acceptMiravaRequiredConsents({
        userId:
          session.userId,
        locale:
          result.data.locale,
        source:
          "privacy-api",
      })
  } else if (
    result.data.action ===
    "accept_openai_identity_analysis"
  ) {
    privacy =
      await acceptMiravaOpenAiIdentityAnalysisConsent({
        userId:
          session.userId,
        locale:
          result.data.locale,
        disclosureAccepted:
          result.data.disclosureAccepted,
        source:
          "privacy-api",
      })
  } else if (
    result.data.action ===
    "accept_external_image_generation"
  ) {
    privacy =
      await acceptMiravaExternalImageGenerationConsent({
        userId:
          session.userId,
        locale:
          result.data.locale,
        disclosureAccepted:
          result.data.disclosureAccepted,
        source:
          "privacy-api",
      })
  } else {
    privacy =
      await setMiravaAnalyticsDecision({
        userId:
          session.userId,
        locale:
          result.data.locale,
        accepted:
          result.data.accepted,
        source:
          "privacy-api",
      })
  }

  return apiSuccess({
    privacy,
  })
}
