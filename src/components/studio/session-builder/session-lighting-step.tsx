"use client"

import {
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react"

import {
  MIRAVA_SESSION_SHOT_COUNT,
} from "@/lib/mirava/session-builder/schema"
import {
  MIRAVA_LIGHTING_PRESETS,
  type MiravaLightingPresetId,
} from "@/lib/mirava/session-builder/lighting-presets"
import {
  getMiravaSetPreset,
  type MiravaSetPresetId,
} from "@/lib/mirava/session-builder/set-presets"
import {
  cn,
} from "@/lib/utils"

type Locale =
  | "fr"
  | "es"

type MiravaSessionLightingPreset =
  (typeof MIRAVA_LIGHTING_PRESETS)[number]

type LightingPreviewImages =
  Partial<
    Record<
      MiravaLightingPresetId,
      string
    >
  >

type SessionLightingStepProps = {
  locale: Locale
  shotCount?: number
  setPresetId:
    MiravaSetPresetId
  selectedLightingPresetId:
    | MiravaLightingPresetId
    | null
  onSelect:
    (
      presetId:
        MiravaLightingPresetId,
    ) => void
  onBack: () => void
  onContinue: () => void
  continueBusy?: boolean
  previewImages?:
    LightingPreviewImages
}

export const SESSION_LIGHTING_COPY = {
  fr: {
    eyebrow:
      "Étape 2 · Lumière",
    title:
      "Choisissez votre lumière.",
    intro:
      "Le plateau reste identique. Seule la manière dont MIRAVA éclaire le sujet change sur l’ensemble de la séance.",
    previewEyebrow:
      "Aperçu lumière",
    continuity:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Même plateau · 1 photo"
          : `Même plateau · ${shotCount} photos`,
    setLabel:
      "Studio",
    emptyPreview:
      "Sélectionnez une lumière pour visualiser son caractère.",
    back:
      "Studio",
    continue:
      "Composer le look",
    continuing:
      "Préparation…",
  },
  es: {
    eyebrow:
      "Paso 2 · Luz",
    title:
      "Elige tu luz.",
    intro:
      "El plató permanece idéntico. Solo cambia la forma en que MIRAVA ilumina al sujeto durante toda la sesión.",
    previewEyebrow:
      "Vista previa de luz",
    continuity:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Mismo plató · 1 foto"
          : `Mismo plató · ${shotCount} fotos`,
    setLabel:
      "Estudio",
    emptyPreview:
      "Selecciona una luz para visualizar su carácter.",
    back:
      "Estudio",
    continue:
      "Componer el look",
    continuing:
      "Preparando…",
  },
} as const

export function getMiravaSessionLightingOptions() {
  return MIRAVA_LIGHTING_PRESETS
}

export const MIRAVA_LIGHTING_VISUAL_PROFILE:
  Record<
    MiravaLightingPresetId,
    Readonly<{
      keyPosition: string
      keySize: string
      keyBlur: string
      keyOpacity: string
      fillOpacity: string
      shadowOpacity: string
      vignetteOpacity: string
      subjectContrast: string
    }>
  > = {
    "soft-v1": {
      keyPosition:
        "left-[5%] top-[8%]",
      keySize:
        "h-[62%] w-[68%]",
      keyBlur:
        "blur-3xl",
      keyOpacity:
        "bg-white/28",
      fillOpacity:
        "bg-white/[0.10]",
      shadowOpacity:
        "bg-black/10",
      vignetteOpacity:
        "opacity-10",
      subjectContrast:
        "opacity-75",
    },
    "clean-v1": {
      keyPosition:
        "left-[12%] top-[7%]",
      keySize:
        "h-[55%] w-[58%]",
      keyBlur:
        "blur-2xl",
      keyOpacity:
        "bg-white/35",
      fillOpacity:
        "bg-white/[0.16]",
      shadowOpacity:
        "bg-black/15",
      vignetteOpacity:
        "opacity-15",
      subjectContrast:
        "opacity-90",
    },
    "direct-flash-v1": {
      keyPosition:
        "left-[28%] top-[16%]",
      keySize:
        "h-[48%] w-[44%]",
      keyBlur:
        "blur-xl",
      keyOpacity:
        "bg-white/55",
      fillOpacity:
        "bg-white/[0.06]",
      shadowOpacity:
        "bg-black/30",
      vignetteOpacity:
        "opacity-25",
      subjectContrast:
        "opacity-100",
    },
    "dramatic-v1": {
      keyPosition:
        "-left-[8%] top-[4%]",
      keySize:
        "h-[72%] w-[52%]",
      keyBlur:
        "blur-2xl",
      keyOpacity:
        "bg-white/30",
      fillOpacity:
        "bg-transparent",
      shadowOpacity:
        "bg-black/55",
      vignetteOpacity:
        "opacity-55",
      subjectContrast:
        "opacity-95",
    },
  }

const SET_BACKGROUNDS:
  Record<
    MiravaSetPresetId,
    string
  > = {
    "white-cyclorama-v1":
      "linear-gradient(145deg,#eceae4 0%,#d5d2cb 55%,#aaa8a3 100%)",
    "grey-cyclorama-v1":
      "linear-gradient(145deg,#91918e 0%,#60605d 55%,#333331 100%)",
    "black-cyclorama-v1":
      "linear-gradient(145deg,#252525 0%,#0e0e0e 58%,#030303 100%)",
    "pro-fashion-studio-v1":
      "linear-gradient(145deg,#918d87 0%,#514e4a 52%,#20201f 100%)",
    "editorial-studio-v1":
      "linear-gradient(145deg,#c6c0b7 0%,#706b65 50%,#242323 100%)",
    "daylight-studio-v1":
      "linear-gradient(145deg,#e2dfd6 0%,#bebbb1 50%,#85817b 100%)",
  }

function StudioBase({
  setPresetId,
}: {
  setPresetId:
    MiravaSetPresetId
}) {
  const daylight =
    setPresetId ===
    "daylight-studio-v1"

  const editorial =
    setPresetId ===
    "editorial-studio-v1"

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          SET_BACKGROUNDS[
            setPresetId
          ],
      }}
    >
      <div className="absolute inset-x-[8%] bottom-[7%] h-[52%] rounded-[50%_50%_7%_7%/18%_18%_7%_7%] border border-white/10 bg-white/[0.07]" />

      {daylight ? (
        <>
          <div className="absolute left-[9%] top-[8%] h-[50%] w-[27%] border border-white/30 bg-white/15" />
          <div className="absolute left-[39%] top-[8%] h-[50%] w-[27%] border border-white/25 bg-white/10" />
        </>
      ) : null}

      {editorial ? (
        <>
          <div className="absolute -left-[6%] top-[14%] h-[70%] w-[36%] rotate-[8deg] bg-black/15" />
          <div className="absolute right-[9%] top-[11%] h-[58%] w-[24%] -rotate-[7deg] border border-white/12 bg-white/[0.06]" />
        </>
      ) : null}
    </div>
  )
}

function LightingScene({
  preset,
  setPresetId,
  image,
  compact = false,
}: {
  preset:
    MiravaSessionLightingPreset
  setPresetId:
    MiravaSetPresetId
  image?: string
  compact?: boolean
}) {
  if (image) {
    return (
      <div
        data-mirava-canonical-lighting-preview={
          preset.id
        }
        className="absolute inset-0 overflow-hidden"
      >
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    )
  }

  const profile =
    MIRAVA_LIGHTING_VISUAL_PROFILE[
      preset.id
    ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <StudioBase
          setPresetId={
            setPresetId
          }
        />
      )}

      <div
        aria-hidden="true"
        className={cn(
          "absolute rounded-full",
          profile.keyPosition,
          profile.keySize,
          profile.keyBlur,
          profile.keyOpacity,
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0",
          profile.fillOpacity,
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          "absolute right-0 top-0 h-full w-[48%]",
          profile.shadowOpacity,
          preset.id ===
            "dramatic-v1"
            ? "skew-x-[-9deg]"
            : "",
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 top-[19%] h-[53%] w-[24%] -translate-x-1/2 rounded-[48%_48%_42%_42%/20%_20%_12%_12%] border border-white/20 bg-black/20 shadow-[0_20px_55px_rgba(0,0,0,0.35)]",
          profile.subjectContrast,
        )}
      >
        <div className="absolute left-1/2 top-[-14%] aspect-square w-[42%] -translate-x-1/2 rounded-full border border-white/20 bg-black/20" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,black_100%)]",
          profile.vignetteOpacity,
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-gradient-to-t",
          compact
            ? "from-black/85 via-transparent to-black/10"
            : "from-black/70 via-transparent to-black/10",
        )}
      />
    </div>
  )
}

function LightingCard({
  preset,
  locale,
  selected,
  setPresetId,
  image,
  onSelect,
}: {
  preset:
    MiravaSessionLightingPreset
  locale:
    Locale
  selected:
    boolean
  setPresetId:
    MiravaSetPresetId
  image?: string
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      aria-label={
        preset.name[locale]
      }
      aria-pressed={
        selected
      }
      onClick={
        onSelect
      }
      whileTap={{
        scale: 0.985,
      }}
      className={cn(
        "group relative aspect-[4/3] min-h-[150px] overflow-hidden rounded-[22px] border text-left outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[#ede8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0e0e]",
        selected
          ? "border-[#ede8df] shadow-[0_14px_38px_rgba(0,0,0,0.42)] ring-1 ring-[#ede8df]/80"
          : "border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.24)] hover:border-white/30",
      )}
    >
      <LightingScene
        preset={preset}
        setPresetId={
          setPresetId
        }
        image={image}
        compact
      />

      <div className="absolute right-3 top-3 z-20">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-xl transition-all",
            selected
              ? "border-[#ede8df] bg-[#ede8df] text-[#101111]"
              : "border-white/25 bg-black/35 text-transparent",
          )}
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-4">
        <strong className="block font-jakarta text-[15px] font-semibold text-white">
          {
            preset.name[
              locale
            ]
          }
        </strong>

        <span className="mt-1.5 block font-jakarta text-[11px] leading-[1.45] text-white/70">
          {
            preset.description[
              locale
            ]
          }
        </span>
      </div>
    </motion.button>
  )
}

function LightingPreview({
  preset,
  locale,
  setPresetId,
  image,
  shotCount,
}: {
  preset:
    MiravaSessionLightingPreset
  locale:
    Locale
  setPresetId:
    MiravaSetPresetId
  image?: string
  shotCount: number
}) {
  const copy =
    SESSION_LIGHTING_COPY[
      locale
    ]

  const setPreset =
    getMiravaSetPreset(
      setPresetId,
    )

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-[30px] border border-white/10 bg-[#111212] shadow-[0_28px_80px_rgba(0,0,0,0.38)] lg:min-h-[680px]">
      <LightingScene
        preset={preset}
        setPresetId={
          setPresetId
        }
        image={image}
      />

      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-5 sm:p-6">
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-xl">
          {
            copy.previewEyebrow
          }
        </span>

        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 font-jakarta text-[9px] font-semibold text-white/70 backdrop-blur-xl">
          {
            copy.continuity(
              shotCount,
            )
          }
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-6 sm:p-8 lg:p-10">
        <div className="max-w-xl">
          {setPreset ? (
            <span className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
              {
                copy.setLabel
              }{" "}
              ·{" "}
              {
                setPreset.name[
                  locale
                ]
              }
            </span>
          ) : null}

          <h2 className="mt-2 font-jakarta text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            {
              preset.name[
                locale
              ]
            }
          </h2>

          <p className="mt-3 max-w-lg font-jakarta text-sm leading-6 text-white/72">
            {
              preset.description[
                locale
              ]
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export function SessionLightingStep({
  locale,
  shotCount =
    MIRAVA_SESSION_SHOT_COUNT,
  setPresetId,
  selectedLightingPresetId,
  onSelect,
  onBack,
  onContinue,
  continueBusy = false,
  previewImages,
}: SessionLightingStepProps) {
  const reduceMotion =
    useReducedMotion()

  const copy =
    SESSION_LIGHTING_COPY[
      locale
    ]

  const selectedPreset =
    MIRAVA_LIGHTING_PRESETS.find(
      (preset) =>
        preset.id ===
        selectedLightingPresetId,
    ) ?? null

  return (
    <section
      data-testid="mirava-session-lighting-step"
      className="relative min-h-full w-full bg-[#0d0e0e] text-[#f1f1ed]"
    >
      <div className="mx-auto grid w-full max-w-[1520px] gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-8 lg:px-8 lg:pb-10 lg:pt-8 xl:gap-10">
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

            <h1 className="mt-3 max-w-xl font-jakarta text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#f3f1ec] sm:text-[40px] lg:text-[46px]">
              {
                copy.title
              }
            </h1>

            <p className="mt-4 max-w-xl font-jakarta text-sm leading-6 text-white/58">
              {
                copy.intro
              }
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MIRAVA_LIGHTING_PRESETS.map(
              (
                preset,
              ) => (
                <LightingCard
                  key={
                    preset.id
                  }
                  preset={
                    preset
                  }
                  locale={
                    locale
                  }
                  setPresetId={
                    setPresetId
                  }
                  selected={
                    preset.id ===
                    selectedLightingPresetId
                  }
                  image={
                    previewImages?.[
                      preset.id
                    ]
                  }
                  onSelect={() =>
                    onSelect(
                      preset.id,
                    )
                  }
                />
              ),
            )}
          </div>
        </div>

        <div className="order-first min-w-0 lg:order-none">
          <div className="lg:sticky lg:top-8">
            {selectedPreset ? (
              <LightingPreview
                preset={
                  selectedPreset
                }
                locale={
                  locale
                }
                setPresetId={
                  setPresetId
                }
                shotCount={
                  shotCount
                }
                image={
                  previewImages?.[
                    selectedPreset.id
                  ]
                }
              />
            ) : (
              <div className="flex min-h-[310px] items-center justify-center rounded-[30px] border border-dashed border-white/15 bg-white/[0.025] p-8 text-center lg:min-h-[680px]">
                <p className="max-w-xs font-jakarta text-sm leading-6 text-white/40">
                  {
                    copy.emptyPreview
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0e0e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:sticky lg:bottom-0 lg:bg-[#0d0e0e]/92 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={
              onBack
            }
            className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-jakarta text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] active:scale-[0.985]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>
              {
                copy.back
              }
            </span>
          </button>

          <button
            type="button"
            disabled={
              !selectedPreset ||
              continueBusy
            }
            onClick={
              onContinue
            }
            className={cn(
              "group flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl px-6 font-jakarta text-sm font-semibold transition-all duration-200 sm:flex-none sm:min-w-[220px]",
              selectedPreset &&
                !continueBusy
                ? "bg-[#ede8df] text-[#101111] shadow-[0_8px_30px_rgba(237,232,223,0.12)] hover:bg-white active:scale-[0.985]"
                : "cursor-not-allowed bg-white/8 text-white/28",
            )}
          >
            <span>
              {continueBusy
                ? copy.continuing
                : copy.continue}
            </span>

            <ArrowRight
              className={cn(
                "h-4 w-4 transition-transform",
                selectedPreset &&
                  !continueBusy &&
                  "group-hover:translate-x-0.5",
              )}
            />
          </button>
        </div>
      </div>
    </section>
  )
}

export default SessionLightingStep
