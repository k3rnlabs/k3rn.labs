import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe"
import { validateBody } from "@/lib/validate"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
  withMiravaPrivateHeaders,
} from "@/lib/visual-engine/http"
import {
  getMiravaOffer,
  MIRAVA_STRIPE_PRODUCT,
} from "@/lib/mirava/brand"
import {
  getMiravaDiscoveryAccess,
  isMiravaDiscoveryCreationLocked,
} from "@/lib/visual-engine/discovery"
import {
  isMiravaPublicLaunchEnabled,
} from "@/lib/mirava/server-config"

const schema = z.object({
  offerId:
    z.string().min(1),
  creationId:
    z.string().min(1).optional(),
})

type CheckoutLocale =
  | "fr"
  | "es"

function checkoutLocale(
  req: NextRequest,
): CheckoutLocale {
  const configuredLocale =
    req.headers
      .get("x-mirava-locale")
      ?.toLowerCase()

  if (
    configuredLocale === "es"
  ) {
    return "es"
  }

  return "fr"
}

export async function POST(
  req: NextRequest,
) {
  const locale =
    checkoutLocale(req)

  const message = (
    fr: string,
    es: string,
  ) =>
    locale === "es"
      ? es
      : fr

  const session =
    await verifySession()

  if (!session) {
    return apiError(
      message(
        "Unauthorized",
        "No autorizado.",
      ),
      401,
    )
  }

  if (
    !isMiravaPublicLaunchEnabled()
  ) {
    return apiError(
      message(
        "Les achats MIRAVA ne sont pas encore ouverts.",
        "Las compras de MIRAVA todavía no están disponibles.",
      ),
      503,
    )
  }

  if (!isStripeConfigured()) {
    return apiError(
      message(
        "Le paiement en ligne n’est pas encore configuré (Clé Stripe manquante).",
        "El pago en línea todavía no está configurado (falta la clave de Stripe).",
      ),
      503,
    )
  }

  const limit =
    await checkRateLimit(
      "studioBilling",
      `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`,
    )

  if (!limit.success) {
    return apiError(
      message(
        "Trop de demandes de paiement. Réessayez plus tard.",
        "Demasiadas solicitudes de pago. Inténtalo de nuevo más tarde.",
      ),
      429,
    )
  }

  const parsed =
    await validateBody(
      schema,
      req,
    )

  if ("error" in parsed) {
    return withMiravaPrivateHeaders(
      parsed.error,
    )
  }

  const offer =
    getMiravaOffer(
      parsed.data.offerId,
    )

  if (!offer) {
    return apiError(
      message(
        "Offre MIRAVA introuvable.",
        "No se ha encontrado la oferta de MIRAVA.",
      ),
      400,
    )
  }

  if (!offer.stripePriceId) {
    return apiError(
      message(
        "Cette offre MIRAVA est momentanément indisponible.",
        "Esta oferta de MIRAVA no está disponible temporalmente.",
      ),
      503,
    )
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.userId,
      },
    })

  if (!user) {
    return apiError(
      message(
        "Utilisateur introuvable.",
        "No se ha encontrado al usuario.",
      ),
      404,
    )
  }

  const isDiscovery =
    offer.kind === "discovery"

  if (isDiscovery) {
    const creationId =
      parsed.data.creationId

    if (!creationId) {
      return apiError(
        message(
          "La création à débloquer est manquante.",
          "Falta la creación que se debe desbloquear.",
        ),
        400,
      )
    }

    const [
      creation,
      access,
    ] = await Promise.all([
      db.studioCreation
        .findUnique({
          where: {
            id: creationId,
            userId:
              session.userId,
          },
        }),
      getMiravaDiscoveryAccess(
        session.userId,
      ),
    ])

    if (
      !creation ||
      creation.status !==
        "COMPLETED"
    ) {
      return apiError(
        message(
          "Cette séance découverte n’est pas disponible.",
          "Esta sesión de descubrimiento no está disponible.",
        ),
        409,
      )
    }

    if (
      access.hasVerifiedPurchase
    ) {
      return apiError(
        message(
          "Votre création est déjà débloquée.",
          "Tu creación ya está desbloqueada.",
        ),
        409,
      )
    }

    if (
      !isMiravaDiscoveryCreationLocked(
        access,
        creation.id,
      )
    ) {
      return apiError(
        message(
          "Cette séance découverte n’est pas disponible.",
          "Esta sesión de descubrimiento no está disponible.",
        ),
        409,
      )
    }
  }

  if (
    offer.kind ===
      "subscription"
  ) {
    const currentSubscription =
      await db
        .studioSubscription
        .findUnique({
          where: {
            userId:
              session.userId,
          },
        })

    const activeSubscription =
      currentSubscription
        ?.stripeSubscriptionId &&
      ![
        "canceled",
        "incomplete_expired",
      ].includes(
        currentSubscription
          .status ?? "",
      )

    if (activeSubscription) {
      return apiError(
        message(
          "Un abonnement MIRAVA est déjà actif. Gérez ou modifiez votre forfait depuis le portail d’abonnement.",
          "Ya hay una suscripción de MIRAVA activa. Gestiona o modifica tu plan desde el portal de suscripción.",
        ),
        409,
      )
    }
  }

  try {
    const stripe =
      getStripe()

    const appUrl =
      req.nextUrl.origin

    const creationId =
      parsed.data.creationId

    const checkout =
      await stripe
        .checkout
        .sessions
        .create({
          locale:
            locale === "es"
              ? "es"
              : "fr",
          mode:
            offer.kind ===
              "subscription"
              ? "subscription"
              : "payment",
          billing_address_collection:
            "auto",
          automatic_tax: {
            enabled: true,
          },
          allow_promotion_codes:
            true,
          line_items: [
            {
              price:
                offer
                  .stripePriceId,
              quantity: 1,
            },
          ],
          metadata: {
            product:
              MIRAVA_STRIPE_PRODUCT,
            userId:
              session.userId,
            offerId:
              offer.id,
            credits:
              String(
                offer.credits,
              ),
            offerKind:
              offer.kind,
            ...(
              creationId
                ? {
                    creationId,
                  }
                : {}
            ),
          },
          ...(
            user.stripeCustomerId
              ? {
                  customer:
                    user
                      .stripeCustomerId,
                }
              : {
                  customer_email:
                    user.email,
                }
          ),
          ...(
            offer.kind ===
              "subscription"
              ? {
                  subscription_data: {
                    metadata: {
                      product:
                        MIRAVA_STRIPE_PRODUCT,
                      userId:
                        session.userId,
                      offerId:
                        offer.id,
                    },
                  },
                }
              : {}
          ),
          success_url:
            creationId
              ? `${appUrl}/visual-engine/studio?view=create&checkout=${isDiscovery ? "discovery-success" : "success"}&creation=${encodeURIComponent(creationId)}`
              : `${appUrl}/visual-engine/studio?view=create&checkout=success`,
          cancel_url:
            creationId
              ? `${appUrl}/visual-engine/studio?view=create&checkout=${isDiscovery ? "discovery-cancelled" : "cancelled"}&creation=${encodeURIComponent(creationId)}`
              : `${appUrl}/visual-engine/studio?view=create&checkout=cancelled`,
        })

    if (!checkout.url) {
      return apiError(
        message(
          "Impossible de créer le paiement MIRAVA Studio.",
          "No se ha podido crear el pago de MIRAVA Studio.",
        ),
        500,
      )
    }

    return apiSuccess({
      url: checkout.url,
    })
  } catch (error) {
    console.error(
      "[billing] checkout error:",
      error,
    )

    return apiError(
      message(
        "Le paiement MIRAVA Studio est momentanément indisponible. Réessayez dans un instant.",
        "El pago de MIRAVA Studio no está disponible temporalmente. Inténtalo de nuevo en unos instantes.",
      ),
      500,
    )
  }
}
