"use client"

import {
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  ArrowLeft,
  Camera,
  Check,
  Coins,
  Images,
  Lightbulb,
  Loader2,
  Shirt,
  Sparkles,
} from "lucide-react"

import {
  getMiravaLightingPreset,
} from "@/lib/mirava/session-builder/lighting-presets"
import {
  resolveMiravaSessionDirection,
} from "@/lib/mirava/session-builder/resolve-session-direction"
import {
  type MiravaSessionBuilderReady,
} from "@/lib/mirava/session-builder/schema"
import {
  createMiravaSessionShotPlan,
} from "@/lib/mirava/session-builder/shot-plan"
import {
  getMiravaSetPreset,
} from "@/lib/mirava/session-builder/set-presets"
import {
  type MiravaSessionLookClientItem,
} from "@/lib/mirava/session-builder/session-look-upload.client"
import {
  cn,
} from "@/lib/utils"

import {
  SESSION_DIRECTION_COPY,
  SESSION_DIRECTION_OPTIONS,
} from "./session-direction-step"

type Locale =
  | "fr"
  | "es"

type SessionReviewStepProps = {
  locale: Locale
  config:
    MiravaSessionBuilderReady
  configurationReady: boolean
  lookItems?:
    readonly MiravaSessionLookClientItem[]
  lookItemCount?: number
  creditCost: number
  availableCredits?:
    | number
    | null
  launchEnabled?: boolean
  setPreviewImages?:
    Partial<
      Record<
        string,
        string
      >
    >
  lightingPreviewImages?:
    Partial<
      Record<
        string,
        string
      >
    >
  onBack: () => void
  onStart: () => void
  startBusy?: boolean
}

export const SESSION_REVIEW_COPY = {
  fr: {
    eyebrow:
      "Étape 5 · Récapitulatif",
    title:
      "Votre séance est prête.",
    intro:
      "Vérifiez votre plateau, votre lumière, votre direction, votre look et le plan préparé par MIRAVA avant de lancer la séance.",
    callSheet:
      "Votre séance",
    direction:
      "Direction",
    studio:
      "Studio",
    lighting:
      "Lumière",
    look:
      "Look",
    referenceLook:
      "Référence artistique",
    customLook:
      "Look personnalisé",
    customItems:
      "articles",
    customItem:
      "article",
    shots:
      "Plan de séance",
    continuity:
      "Identité, studio, lumière, direction et look restent cohérents pendant toute la séance.",
    credits:
      "Crédits",
    sessionCost:
      "Coût de la séance",
    available:
      "Disponibles",
    insufficient:
      "Crédits insuffisants pour lancer cette séance.",
    incomplete:
      "La configuration doit être complète avant le lancement.",
    unavailable:
      "Votre séance est configurée. Le lancement sera activé avec le moteur de séance.",
    ready:
      "Prêt à photographier",
    back:
      "Look",
    start:
      "Démarrer la séance",
    starting:
      "Ouverture de la chambre noire…",
    photoSingular:
      "photo",
    photoPlural:
      "photos",
    noInstruction:
      "Aucune précision",
    visualPreview:
      "Aperçu de la séance",
    lightingPreview:
      "Éclairage choisi",
    lookPreview:
      "Look de la séance",
  },
  es: {
    eyebrow:
      "Paso 5 · Resumen",
    title:
      "Tu sesión está lista.",
    intro:
      "Revisa el plató, la luz, la dirección, el look y el plan preparado por MIRAVA antes de iniciar la sesión.",
    callSheet:
      "Tu sesión",
    direction:
      "Dirección",
    studio:
      "Estudio",
    lighting:
      "Luz",
    look:
      "Look",
    referenceLook:
      "Referencia artística",
    customLook:
      "Look personalizado",
    customItems:
      "prendas",
    customItem:
      "prenda",
    shots:
      "Plan de sesión",
    continuity:
      "Identidad, estudio, luz, dirección y look permanecen coherentes durante toda la sesión.",
    credits:
      "Créditos",
    sessionCost:
      "Coste de la sesión",
    available:
      "Disponibles",
    insufficient:
      "Créditos insuficientes para iniciar esta sesión.",
    incomplete:
      "La configuración debe estar completa antes de iniciar.",
    unavailable:
      "Tu sesión está configurada. El lanzamiento se activará con el motor de sesión.",
    ready:
      "Listo para fotografiar",
    back:
      "Look",
    start:
      "Iniciar la sesión",
    starting:
      "Abriendo el cuarto oscuro…",
    photoSingular:
      "foto",
    photoPlural:
      "fotos",
    noInstruction:
      "Sin precisión",
    visualPreview:
      "Vista previa de la sesión",
    lightingPreview:
      "Iluminación elegida",
    lookPreview:
      "Look de la sesión",
  },
} as const

function reviewOptionLabel(
  options:
    readonly {
      value: string
      label: string
    }[],
  value: string,
): string {
  return (
    options.find(
      (
        option,
      ) =>
        option.value ===
        value,
    )?.label ??
    value
  )
}

export function formatMiravaSessionReviewPhotoCount(
  locale:
    Locale,
  shotCount: number,
): string {
  const copy =
    SESSION_REVIEW_COPY[
      locale
    ]

  return `${shotCount} ${
    shotCount === 1
      ? copy.photoSingular
      : copy.photoPlural
  }`
}

export function createMiravaSessionReviewDirectionSummary(
  config:
    MiravaSessionBuilderReady,
  locale:
    Locale,
) {
  const labels =
    SESSION_DIRECTION_COPY[
      locale
    ]

  const options =
    SESSION_DIRECTION_OPTIONS[
      locale
    ]

  const instruction =
    config.userInstruction
      .trim()

  return [
    {
      key:
        "framing",
      label:
        labels.framing,
      value:
        reviewOptionLabel(
          options.framing,
          config.framing,
        ),
    },
    {
      key:
        "pose",
      label:
        labels.pose,
      value:
        reviewOptionLabel(
          options.pose,
          config.pose,
        ),
    },
    {
      key:
        "expression",
      label:
        labels.expression,
      value:
        reviewOptionLabel(
          options.expression,
          config.expression,
        ),
    },
    {
      key:
        "gaze",
      label:
        labels.gaze,
      value:
        reviewOptionLabel(
          options.gaze,
          config.gaze,
        ),
    },
    {
      key:
        "makeup",
      label:
        labels.makeup,
      value:
        reviewOptionLabel(
          options.makeup,
          config.makeup,
        ),
    },
    {
      key:
        "skinFinish",
      label:
        labels.skin,
      value:
        reviewOptionLabel(
          options.skinFinish,
          config.skinFinish,
        ),
    },
    {
      key:
        "hair",
      label:
        labels.hair,
      value:
        reviewOptionLabel(
          options.hair,
          config.hair,
        ),
    },
    {
      key:
        "instruction",
      label:
        labels.instruction,
      value:
        instruction ||
        SESSION_REVIEW_COPY[
          locale
        ].noInstruction,
    },
  ] as const
}

export function createMiravaSessionReviewCallSheet(
  config:
    MiravaSessionBuilderReady,
  locale:
    Locale,
) {
  const direction =
    resolveMiravaSessionDirection(
      config,
    )

  const setPreset =
    getMiravaSetPreset(
      direction.set.presetId,
    )

  const lightingPreset =
    getMiravaLightingPreset(
      direction.lighting
        .presetId,
    )

  if (
    !setPreset ||
    !lightingPreset
  ) {
    throw new Error(
      "MIRAVA_SESSION_REVIEW_PRESET_MISSING",
    )
  }

  const shots =
    createMiravaSessionShotPlan(
      direction,
    )

  return {
    set: {
      id:
        setPreset.id,
      name:
        setPreset.name[
          locale
        ],
      description:
        setPreset.description[
          locale
        ],
    },
    lighting: {
      id:
        lightingPreset.id,
      name:
        lightingPreset.name[
          locale
        ],
      description:
        lightingPreset
          .description[
          locale
        ],
    },
    lookMode:
      direction.lookMode,
    direction:
      createMiravaSessionReviewDirectionSummary(
        config,
        locale,
      ),
    shots:
      shots.map(
        (shot) => ({
          shotIndex:
            shot.shotIndex,
          shotIntent:
            shot.shotIntent,
          label:
            shot.label[
              locale
            ],
          continuityLocks:
            shot.continuityLocks,
        }),
      ),
  } as const
}

export function canStartMiravaSessionReview({
  configurationReady,
  creditCost,
  availableCredits,
  launchEnabled = true,
  startBusy = false,
}: {
  configurationReady: boolean
  creditCost: number
  availableCredits?:
    | number
    | null
  launchEnabled?: boolean
  startBusy?: boolean
}): boolean {
  if (
    !launchEnabled ||
    !configurationReady ||
    startBusy ||
    !Number.isFinite(
      creditCost,
    ) ||
    creditCost < 0
  ) {
    return false
  }

  if (
    availableCredits !==
      undefined &&
    availableCredits !==
      null &&
    (
      !Number.isFinite(
        availableCredits,
      ) ||
      availableCredits <
        creditCost
    )
  ) {
    return false
  }

  return true
}

function SummaryCard({
  icon,
  label,
  title,
  body,
}: {
  icon:
    React.ReactNode
  label: string
  title: string
  body?: string
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-[#c9b7a3]">
          {icon}
        </div>

        <div className="min-w-0">
          <span className="font-jakarta text-[8px] font-bold uppercase tracking-[0.14em] text-white/35">
            {label}
          </span>

          <strong className="mt-1 block font-jakarta text-[13px] font-semibold leading-5 text-white">
            {title}
          </strong>

          {body ? (
            <p className="mt-1 font-jakarta text-[10px] leading-4 text-white/42">
              {body}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SessionReviewStep({
  locale,
  config,
  configurationReady,
  lookItems = [],
  lookItemCount = 0,
  creditCost,
  availableCredits = null,
  launchEnabled = true,
  setPreviewImages,
  lightingPreviewImages,
  onBack,
  onStart,
  startBusy = false,
}: SessionReviewStepProps) {
  const reduceMotion =
    useReducedMotion()

  const copy =
    SESSION_REVIEW_COPY[
      locale
    ]

  const callSheet =
    createMiravaSessionReviewCallSheet(
      config,
      locale,
    )

  const photoCountLabel =
    formatMiravaSessionReviewPhotoCount(
      locale,
      config.shotCount,
    )

  const insufficientCredits =
    availableCredits !==
      null &&
    Number.isFinite(
      availableCredits,
    ) &&
    availableCredits <
      creditCost

  const canStart =
    canStartMiravaSessionReview(
      {
        configurationReady,
        creditCost,
        availableCredits,
        launchEnabled,
        startBusy,
      },
    )

  const customItemCount =
    Math.max(
      lookItemCount,
      lookItems.length,
    )

  const lookTitle =
    callSheet.lookMode ===
    "REFERENCE"
      ? copy.referenceLook
      : copy.customLook

  const lookBody =
    callSheet.lookMode ===
    "CUSTOM"
      ? `${customItemCount} ${
          customItemCount === 1
            ? copy.customItem
            : copy.customItems
        }`
      : undefined

  const setPreviewImage =
    setPreviewImages?.[
      callSheet.set.id
    ] ??
    null

  const lightingPreviewImage =
    lightingPreviewImages?.[
      callSheet.lighting.id
    ] ??
    null

  const lookPreviewAssets =
    lookItems.flatMap(
      (
        item,
      ) =>
        item.assets.flatMap(
          (
            asset,
            index,
          ) =>
            asset.url
              ? [
                  {
                    key:
                      asset.id ??
                      `${item.id}-${index}-${asset.viewKey}`,
                    url:
                      asset.url,
                    label:
                      item.label ??
                      item.category,
                  },
                ]
              : [],
        ),
    )

  return (
    <section
      data-testid="mirava-session-review-step"
      className="relative min-h-full w-full bg-[#0d0e0e] text-[#f1f1ed]"
    >
      <div className="mx-auto grid w-full max-w-[1520px] gap-8 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:px-8 lg:pb-10 lg:pt-8 xl:gap-12">
        <div className="min-w-0">
          <motion.div
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 10,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
            }}
          >
            <span className="font-jakarta text-[10px] font-bold uppercase tracking-[0.18em] text-[#c7b6a4]">
              {
                copy.eyebrow
              }
            </span>

            <h1 className="mt-3 max-w-2xl font-jakarta text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#f3f1ec] sm:text-[40px] lg:text-[46px]">
              {
                copy.title
              }
            </h1>

            <p className="mt-4 max-w-2xl font-jakarta text-sm leading-6 text-white/58">
              {
                copy.intro
              }
            </p>
          </motion.div>

          <div className="mt-8">
            <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              {
                copy.callSheet
              }
            </span>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={
                  <Camera className="h-5 w-5" />
                }
                label={
                  copy.studio
                }
                title={
                  callSheet
                    .set.name
                }
                body={
                  callSheet
                    .set
                    .description
                }
              />

              <SummaryCard
                icon={
                  <Lightbulb className="h-5 w-5" />
                }
                label={
                  copy.lighting
                }
                title={
                  callSheet
                    .lighting
                    .name
                }
                body={
                  callSheet
                    .lighting
                    .description
                }
              />

              <SummaryCard
                icon={
                  <Shirt className="h-5 w-5" />
                }
                label={
                  copy.look
                }
                title={
                  lookTitle
                }
                body={
                  lookBody
                }
              />
            </div>
          </div>

          <div className="mt-6">
            <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              {
                copy.direction
              }
            </span>

            <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.022]">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {
                  callSheet
                    .direction
                    .map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.key
                          }
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-2.5",
                            item.key !==
                              "instruction" &&
                              "sm:odd:border-r",
                            item.key ===
                              "instruction" &&
                              "sm:col-span-2",
                          )}
                        >
                          <span className="shrink-0 font-jakarta text-[8px] font-bold uppercase tracking-[0.12em] text-white/30">
                            {
                              item.label
                            }
                          </span>

                          <strong className="min-w-0 break-words text-right font-jakarta text-[12px] font-semibold leading-5 text-white/78">
                            {
                              item.value
                            }
                          </strong>
                        </div>
                      ),
                    )
                }
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                  {
                    copy.shots
                  }
                </span>

                <p className="mt-1.5 max-w-xl font-jakarta text-[11px] leading-5 text-white/42">
                  {
                    copy.continuity
                  }
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-jakarta text-[9px] font-semibold text-white/55">
                {
                  photoCountLabel
                }
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {callSheet.shots.map(
                (
                  shot,
                ) => (
                  <div
                    key={
                      shot.shotIntent
                    }
                    className="group rounded-[16px] border border-white/10 bg-white/[0.025] px-3.5 py-3 transition hover:border-white/18 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 font-jakarta text-[9px] font-semibold tabular-nums text-[#c9b7a3]">
                        {
                          shot.shotIndex +
                          1
                        }
                      </span>

                      <div className="min-w-0">
                        <strong className="block font-jakarta text-[13px] font-semibold text-white">
                          {
                            shot.label
                          }
                        </strong>

                        <span className="mt-0.5 block truncate font-jakarta text-[9px] uppercase tracking-[0.12em] text-white/25">
                          {
                            shot.shotIntent
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] shadow-[0_24px_75px_rgba(0,0,0,0.28)]">
              <div
                data-mirava-review-visual-preview
                className="relative min-h-[300px] overflow-hidden border-b border-white/10 bg-[#111212]"
              >
                {setPreviewImage ? (
                  <img
                    src={
                      setPreviewImage
                    }
                    alt={
                      callSheet
                        .set.name
                    }
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(219,201,179,0.18),transparent_38%),linear-gradient(145deg,#272625,#111212_60%,#090a0a)]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/80" />

                <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-white/75 backdrop-blur-xl">
                      MIRAVA SESSION
                    </span>

                    {configurationReady ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-[#d7cab7]/25 bg-black/30 px-3 py-1.5 font-jakarta text-[9px] font-semibold text-[#eee5da] backdrop-blur-xl">
                        <Check className="h-3 w-3" />
                        {
                          copy.ready
                        }
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <span className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      {
                        callSheet
                          .set.name
                      }
                    </span>

                    <h2 className="mt-1.5 font-jakarta text-3xl font-semibold tracking-[-0.035em] text-white">
                      {
                        photoCountLabel
                      }
                    </h2>
                  </div>
                </div>
              </div>

              <div
                data-mirava-review-moodboard
                className="border-b border-white/10 p-4 sm:p-5"
              >
                <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
                  {
                    copy.visualPreview
                  }
                </span>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black/20">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#111212]">
                      {lightingPreviewImage ? (
                        <img
                          src={
                            lightingPreviewImage
                          }
                          alt={
                            callSheet
                              .lighting.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Lightbulb className="h-5 w-5 text-white/20" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8">
                        <span className="font-jakarta text-[8px] font-bold uppercase tracking-[0.13em] text-white/45">
                          {
                            copy.lightingPreview
                          }
                        </span>

                        <strong className="mt-0.5 block truncate font-jakarta text-[11px] font-semibold text-white/85">
                          {
                            callSheet
                              .lighting.name
                          }
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black/20">
                    <div className="min-h-full p-2.5">
                      <span className="font-jakarta text-[8px] font-bold uppercase tracking-[0.13em] text-white/40">
                        {
                          copy.lookPreview
                        }
                      </span>

                      {callSheet.lookMode ===
                        "CUSTOM" &&
                      lookPreviewAssets.length >
                        0 ? (
                        <div
                          data-mirava-review-look-thumbnails
                          className="mt-2 grid grid-cols-3 gap-1.5"
                        >
                          {lookPreviewAssets.map(
                            (
                              asset,
                            ) => (
                              <div
                                key={
                                  asset.key
                                }
                                className="relative aspect-square overflow-hidden rounded-[10px] bg-[#111212]"
                              >
                                <img
                                  src={
                                    asset.url
                                  }
                                  alt={
                                    asset.label
                                  }
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex min-h-[92px] items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.02] px-3 text-center">
                          <span className="font-jakarta text-[10px] leading-4 text-white/45">
                            {
                              lookTitle
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-[#c9b7a3]" />

                  <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
                    {
                      copy.credits
                    }
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-jakarta text-xs text-white/48">
                      {
                        copy.sessionCost
                      }
                    </span>

                    <strong className="font-jakarta text-sm font-semibold tabular-nums text-white">
                      {
                        creditCost
                      }
                    </strong>
                  </div>

                  {availableCredits !==
                  null ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-jakarta text-xs text-white/48">
                        {
                          copy.available
                        }
                      </span>

                      <strong
                        className={cn(
                          "font-jakarta text-sm font-semibold tabular-nums",
                          insufficientCredits
                            ? "text-[#dfaa9b]"
                            : "text-white",
                        )}
                      >
                        {
                          availableCredits
                        }
                      </strong>
                    </div>
                  ) : null}
                </div>

                {!configurationReady ? (
                  <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.045] px-4 py-3 font-jakarta text-[11px] leading-5 text-amber-50/65">
                    {
                      copy.incomplete
                    }
                  </div>
                ) : insufficientCredits ? (
                  <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-300/[0.045] px-4 py-3 font-jakarta text-[11px] leading-5 text-red-100/70">
                    {
                      copy.insufficient
                    }
                  </div>
                ) : !launchEnabled ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 font-jakarta text-[11px] leading-5 text-white/50">
                    {
                      copy.unavailable
                    }
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={
                    !canStart
                  }
                  onClick={
                    onStart
                  }
                  className={cn(
                    "mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-6 font-jakarta text-sm font-semibold transition-all duration-200",
                    canStart
                      ? "bg-[#ede8df] text-[#101111] shadow-[0_8px_30px_rgba(237,232,223,0.12)] hover:bg-white active:scale-[0.985]"
                      : "cursor-not-allowed bg-white/[0.07] text-white/25",
                  )}
                >
                  {startBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}

                  <span>
                    {startBusy
                      ? copy.starting
                      : copy.start}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0e0e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:sticky lg:bottom-0 lg:bg-[#0d0e0e]/92 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1520px] items-center">
          <button
            type="button"
            disabled={
              startBusy
            }
            onClick={
              onBack
            }
            className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-jakarta text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] active:scale-[0.985] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              {
                copy.back
              }
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default SessionReviewStep
