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
  MIRAVA_SET_PRESETS,
  type MiravaSetPresetCategory,
  type MiravaSetPresetId,
} from "@/lib/mirava/session-builder/set-presets"
import {
  cn,
} from "@/lib/utils"

type Locale =
  | "fr"
  | "es"

type MiravaSessionSetPreset =
  (typeof MIRAVA_SET_PRESETS)[number]

type PreviewImages =
  Partial<
    Record<
      MiravaSetPresetId,
      string
    >
  >

type SessionSetStepProps = {
  locale: Locale
  shotCount?: number
  selectedSetPresetId:
    | MiravaSetPresetId
    | null
  onSelect:
    (
      presetId:
        MiravaSetPresetId,
    ) => void
  onBack: () => void
  onContinue: () => void
  continueBusy?: boolean
  previewImages?:
    PreviewImages
}

export const SESSION_SET_COPY = {
  fr: {
    eyebrow:
      "Étape 1 · Studio",
    title:
      "Choisissez votre plateau.",
    intro:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Le studio définit l’espace physique de toute la séance. MIRAVA conservera ce décor sur la photo."
          : `Le studio définit l’espace physique de toute la séance. MIRAVA conservera ce décor sur les ${shotCount} photos.`,
    essential:
      "Essentiels",
    essentialHint:
      "Des plateaux intemporels pour portrait, mode et campagne.",
    signature:
      "Signature",
    signatureHint:
      "Des espaces plus construits pour une direction éditoriale forte.",
    previewEyebrow:
      "Votre plateau",
    continuity:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Conservé sur la photo"
          : `Conservé sur les ${shotCount} photos`,
    emptyPreview:
      "Sélectionnez un studio pour préparer votre plateau.",
    continue:
      "Choisir la lumière",
    continuing:
      "Préparation…",
  },
  es: {
    eyebrow:
      "Paso 1 · Estudio",
    title:
      "Elige tu plató.",
    intro:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "El estudio define el espacio físico de toda la sesión. MIRAVA conservará este escenario en la foto."
          : `El estudio define el espacio físico de toda la sesión. MIRAVA conservará este escenario en las ${shotCount} fotos.`,
    essential:
      "Esenciales",
    essentialHint:
      "Platós atemporales para retrato, moda y campaña.",
    signature:
      "Signature",
    signatureHint:
      "Espacios más construidos para una dirección editorial fuerte.",
    previewEyebrow:
      "Tu plató",
    continuity:
      (
        shotCount: number,
      ) =>
        shotCount === 1
          ? "Conservado en la foto"
          : `Conservado en las ${shotCount} fotos`,
    emptyPreview:
      "Selecciona un estudio para preparar tu plató.",
    continue:
      "Elegir la luz",
    continuing:
      "Preparando…",
  },
} as const

export type MiravaSessionSetSection =
  Readonly<{
    category:
      MiravaSetPresetCategory
    title: string
    hint: string
    presets:
      readonly MiravaSessionSetPreset[]
  }>

export function getMiravaSessionSetSections(
  locale: Locale,
): readonly MiravaSessionSetSection[] {
  const copy =
    SESSION_SET_COPY[locale]

  return [
    {
      category:
        "ESSENTIAL",
      title:
        copy.essential,
      hint:
        copy.essentialHint,
      presets:
        MIRAVA_SET_PRESETS.filter(
          (preset) =>
            preset.category ===
            "ESSENTIAL",
        ),
    },
    {
      category:
        "SIGNATURE",
      title:
        copy.signature,
      hint:
        copy.signatureHint,
      presets:
        MIRAVA_SET_PRESETS.filter(
          (preset) =>
            preset.category ===
            "SIGNATURE",
        ),
    },
  ]
}

const FALLBACK_BACKGROUNDS:
  Record<
    MiravaSetPresetId,
    string
  > = {
    "white-cyclorama-v1":
      "linear-gradient(145deg, #f4f2ec 0%, #dedbd3 48%, #bdbab3 100%)",
    "grey-cyclorama-v1":
      "linear-gradient(145deg, #989896 0%, #696967 48%, #3b3b3a 100%)",
    "black-cyclorama-v1":
      "linear-gradient(145deg, #272727 0%, #101010 55%, #050505 100%)",
    "pro-fashion-studio-v1":
      "linear-gradient(135deg, #a19c94 0%, #5e5a55 45%, #242322 100%)",
    "editorial-studio-v1":
      "linear-gradient(145deg, #d4cec4 0%, #77716a 44%, #262525 100%)",
    "daylight-studio-v1":
      "linear-gradient(135deg, #e7e4dc 0%, #c9c5b9 42%, #908b82 100%)",
  }

function SetFallbackVisual({
  preset,
}: {
  preset:
    MiravaSessionSetPreset
}) {
  const isDaylight =
    preset.id ===
    "daylight-studio-v1"

  const isEditorial =
    preset.id ===
    "editorial-studio-v1"

  const isFashion =
    preset.id ===
    "pro-fashion-studio-v1"

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          FALLBACK_BACKGROUNDS[
            preset.id
          ],
      }}
    >
      <div
        className={cn(
          "absolute inset-x-[8%] bottom-[9%] h-[48%] rounded-[50%_50%_8%_8%/18%_18%_8%_8%] border border-white/10",
          preset.id ===
            "white-cyclorama-v1"
            ? "bg-white/35"
            : preset.id ===
                "black-cyclorama-v1"
              ? "bg-black/45"
              : "bg-white/10",
        )}
      />

      {isDaylight ? (
        <>
          <div className="absolute left-[12%] top-[10%] h-[48%] w-[28%] border border-white/35 bg-white/20" />
          <div className="absolute left-[44%] top-[10%] h-[48%] w-[28%] border border-white/35 bg-white/15" />
          <div className="absolute -right-[10%] top-[3%] h-[70%] w-[52%] rotate-[14deg] bg-white/20 blur-2xl" />
        </>
      ) : null}

      {isEditorial ? (
        <>
          <div className="absolute -left-[7%] top-[16%] h-[68%] w-[38%] rotate-[9deg] bg-black/20" />
          <div className="absolute right-[10%] top-[12%] h-[58%] w-[25%] -rotate-[8deg] border border-white/15 bg-white/10" />
        </>
      ) : null}

      {isFashion ? (
        <>
          <div className="absolute left-[11%] top-[12%] h-[52%] w-px bg-white/35" />
          <div className="absolute left-[11%] top-[12%] h-px w-[18%] bg-white/35" />
          <div className="absolute right-[12%] top-[18%] h-24 w-24 rounded-full border border-white/20 bg-black/15 blur-[1px]" />
        </>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
    </div>
  )
}

function SetVisual({
  preset,
  image,
  compact = false,
}: {
  preset:
    MiravaSessionSetPreset
  image?: string
  compact?: boolean
}) {
  return (
    <div className="absolute inset-0">
      {image ? (
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <SetFallbackVisual
          preset={preset}
        />
      )}

      <div
        className={cn(
          "absolute inset-0",
          compact
            ? "bg-gradient-to-t from-black/85 via-black/10 to-transparent"
            : "bg-gradient-to-t from-black/75 via-transparent to-black/15",
        )}
      />
    </div>
  )
}

function SetCard({
  preset,
  locale,
  selected,
  image,
  onSelect,
}: {
  preset:
    MiravaSessionSetPreset
  locale:
    Locale
  selected:
    boolean
  image?: string
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={
        selected
      }
      aria-label={
        preset.name[locale]
      }
      onClick={
        onSelect
      }
      whileTap={{
        scale: 0.985,
      }}
      className={cn(
        "group relative aspect-[4/3] min-h-[138px] overflow-hidden rounded-[22px] border text-left outline-none transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[#ede8df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212]",
        selected
          ? "border-[#ede8df] shadow-[0_14px_38px_rgba(0,0,0,0.42)] ring-1 ring-[#ede8df]/80"
          : "border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.24)] hover:border-white/30",
      )}
    >
      <SetVisual
        preset={preset}
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
        <strong className="block font-jakarta text-[15px] font-semibold leading-tight text-white">
          {
            preset
              .name[
              locale
            ]
          }
        </strong>

        <span className="mt-1.5 block max-w-[28rem] font-jakarta text-[11px] leading-[1.45] text-white/70">
          {
            preset
              .description[
              locale
            ]
          }
        </span>
      </div>
    </motion.button>
  )
}

function SelectedSetPreview({
  preset,
  locale,
  image,
  shotCount,
}: {
  preset:
    MiravaSessionSetPreset
  locale:
    Locale
  image?: string
  shotCount: number
}) {
  const copy =
    SESSION_SET_COPY[locale]

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-[30px] border border-white/10 bg-[#111212] shadow-[0_28px_80px_rgba(0,0,0,0.38)] lg:min-h-[680px]">
      <SetVisual
        preset={preset}
        image={image}
      />

      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-5 sm:p-6">
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 font-jakarta text-[9px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-xl">
          {
            copy
              .previewEyebrow
          }
        </span>

        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 font-jakarta text-[9px] font-semibold text-white/70 backdrop-blur-xl">
          {
            copy
              .continuity(
                shotCount,
              )
          }
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-6 sm:p-8 lg:p-10">
        <div className="max-w-xl">
          <span className="font-jakarta text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
            {preset.category ===
            "ESSENTIAL"
              ? copy.essential
              : copy.signature}
          </span>

          <h2 className="mt-2 font-jakarta text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            {
              preset
                .name[
                locale
              ]
            }
          </h2>

          <p className="mt-3 max-w-lg font-jakarta text-sm leading-6 text-white/72">
            {
              preset
                .description[
                locale
              ]
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export function SessionSetStep({
  locale,
  shotCount =
    MIRAVA_SESSION_SHOT_COUNT,
  selectedSetPresetId,
  onSelect,
  onBack,
  onContinue,
  continueBusy = false,
  previewImages,
}: SessionSetStepProps) {
  const reduceMotion =
    useReducedMotion()

  const copy =
    SESSION_SET_COPY[locale]

  const sections =
    getMiravaSessionSetSections(
      locale,
    )

  const selectedPreset =
    MIRAVA_SET_PRESETS.find(
      (preset) =>
        preset.id ===
        selectedSetPresetId,
    ) ?? null

  return (
    <section
      data-testid="mirava-session-set-step"
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
                copy
                  .eyebrow
              }
            </span>

            <h1 className="mt-3 max-w-xl font-jakarta text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#f3f1ec] sm:text-[40px] lg:text-[46px]">
              {
                copy
                  .title
              }
            </h1>

            <p className="mt-4 max-w-xl font-jakarta text-sm leading-6 text-white/58">
              {
                copy
                  .intro(
                    shotCount,
                  )
              }
            </p>
          </motion.div>

          <div className="mt-8 space-y-8">
            {sections.map(
              (
                section,
              ) => (
                <div
                  key={
                    section.category
                  }
                >
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-jakarta text-sm font-semibold text-white">
                        {
                          section
                            .title
                        }
                      </h2>

                      <p className="mt-1 font-jakarta text-[11px] leading-5 text-white/45">
                        {
                          section
                            .hint
                        }
                      </p>
                    </div>

                    <span className="shrink-0 font-jakarta text-[10px] tabular-nums text-white/35">
                      {
                        section
                          .presets
                          .length
                      }{" "}
                      / 3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {section.presets.map(
                      (
                        preset,
                      ) => (
                        <SetCard
                          key={
                            preset.id
                          }
                          preset={
                            preset
                          }
                          locale={
                            locale
                          }
                          selected={
                            preset.id ===
                            selectedSetPresetId
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
              ),
            )}
          </div>
        </div>

        <div className="order-first min-w-0 lg:order-none">
          <div className="lg:sticky lg:top-8">
            {selectedPreset ? (
              <SelectedSetPreview
                preset={
                  selectedPreset
                }
                locale={
                  locale
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
                    copy
                      .emptyPreview
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0e0e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:sticky lg:bottom-0 lg:bg-[#0d0e0e]/92 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1520px] flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={
              onBack
            }
            disabled={
              continueBusy
            }
            className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-jakarta text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] active:scale-[0.985] disabled:opacity-40 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />

            <span>
              {locale === "fr"
                ? "Retour au Studio"
                : "Volver al Studio"}
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
              "group flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-6 font-jakarta text-sm font-semibold transition-all duration-200 sm:w-auto sm:min-w-[220px]",
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

export default SessionSetStep
