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
  onBack: () => void
  onStart: () => void
  startBusy?: boolean
}

export const SESSION_REVIEW_COPY = {
  fr: {
    eyebrow:
      "Étape 4 · Review",
    title:
      "Votre séance est prête.",
    intro:
      "Vérifiez votre plateau, votre lumière, votre look et les six prises de vue préparées par MIRAVA avant de lancer la séance.",
    callSheet:
      "Call sheet",
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
      "Identité, studio, lumière et look restent verrouillés entre les six photos.",
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
    ready:
      "Prêt à photographier",
    back:
      "Look",
    start:
      "Démarrer la séance",
    starting:
      "Ouverture de la chambre noire…",
    photos:
      "6 photos",
  },
  es: {
    eyebrow:
      "Paso 4 · Review",
    title:
      "Tu sesión está lista.",
    intro:
      "Revisa el plató, la luz, el look y las seis tomas preparadas por MIRAVA antes de iniciar la sesión.",
    callSheet:
      "Call sheet",
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
      "Identidad, estudio, luz y look permanecen bloqueados entre las seis fotos.",
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
    ready:
      "Listo para fotografiar",
    back:
      "Look",
    start:
      "Iniciar la sesión",
    starting:
      "Abriendo el cuarto oscuro…",
    photos:
      "6 fotos",
  },
} as const

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
  startBusy = false,
}: {
  configurationReady: boolean
  creditCost: number
  availableCredits?:
    | number
    | null
  startBusy?: boolean
}): boolean {
  if (
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
    <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[#c9b7a3]">
          {icon}
        </div>

        <div className="min-w-0">
          <span className="font-jakarta text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            {label}
          </span>

          <strong className="mt-1 block font-jakarta text-sm font-semibold text-white">
            {title}
          </strong>

          {body ? (
            <p className="mt-1.5 font-jakarta text-[11px] leading-5 text-white/45">
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

          <div className="mt-8">
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
                  copy.photos
                }
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {callSheet.shots.map(
                (
                  shot,
                ) => (
                  <div
                    key={
                      shot.shotIntent
                    }
                    className="group rounded-[20px] border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/18 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 font-jakarta text-[10px] font-semibold tabular-nums text-[#c9b7a3]">
                        {
                          shot.shotIndex +
                          1
                        }
                      </span>

                      <div className="min-w-0">
                        <strong className="block font-jakarta text-sm font-semibold text-white">
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
              <div className="relative min-h-[260px] border-b border-white/10 bg-[radial-gradient(circle_at_40%_20%,rgba(219,201,179,0.18),transparent_38%),linear-gradient(145deg,#272625,#111212_60%,#090a0a)] p-6 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.55)_100%)]" />

                <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 font-jakarta text-[9px] font-bold uppercase tracking-[0.15em] text-white/65 backdrop-blur-xl">
                      MIRAVA SESSION
                    </span>

                    {configurationReady ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-[#d7cab7]/20 bg-[#d7cab7]/10 px-3 py-1.5 font-jakarta text-[9px] font-semibold text-[#e5ddd2]">
                        <Check className="h-3 w-3" />
                        {
                          copy.ready
                        }
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <Images className="h-6 w-6 text-[#c9b7a3]" />

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <span className="font-jakarta text-[10px] uppercase tracking-[0.14em] text-white/35">
                          {
                            callSheet
                              .set.name
                          }
                        </span>

                        <h2 className="mt-1.5 font-jakarta text-3xl font-semibold tracking-[-0.035em] text-white">
                          {
                            copy.photos
                          }
                        </h2>
                      </div>

                      <Sparkles className="h-5 w-5 text-white/30" />
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
