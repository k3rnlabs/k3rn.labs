"use client"

import {
  useState,
} from "react"
import {
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"

import {
  type MiravaSessionBuilderClientPatch,
} from "@/lib/mirava/session-builder/session-builder.client"
import {
  MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS,
  MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS,
  type MiravaSessionBuilderV2Options,
} from "@/lib/mirava/session-builder/session-options"
import {
  cn,
} from "@/lib/utils"

type Locale =
  | "fr"
  | "es"

export type MiravaSessionDirectionState =
  Pick<
    MiravaSessionBuilderV2Options,
    | "framing"
    | "pose"
    | "expression"
    | "gaze"
    | "makeup"
    | "skinFinish"
    | "hair"
    | "userInstruction"
  >

type SessionDirectionStepProps = {
  locale: Locale
  config:
    MiravaSessionDirectionState &
    Pick<
      MiravaSessionBuilderV2Options,
      "shotCount"
    >
  saving?: boolean
  onChange:
    (
      patch:
        MiravaSessionBuilderClientPatch,
    ) => Promise<void>
  onBack:
    (
      patch:
        MiravaSessionBuilderClientPatch,
    ) => void
  onContinue:
    (
      patch:
        MiravaSessionBuilderClientPatch,
    ) => void
}

export const SESSION_DIRECTION_COPY = {
  fr: {
    eyebrow:
      "Étape 3 · Direction",
    title:
      "Dirigez votre séance.",
    intro:
      "Cadrez le modèle, choisissez son attitude et ajustez son apparence sans modifier son identité.",
    session:
      "Séance",
    sessionHint:
      "Choisissez le nombre exact de clichés. MIRAVA adapte automatiquement le plan de séance et le coût.",
    shotCount:
      "Nombre de clichés",
    shotCountHint:
      "1 cliché = 1 crédit",
    model:
      "Modèle",
    modelHint:
      "Cadrage, posture et présence devant l’objectif.",
    appearance:
      "Apparence",
    appearanceHint:
      "Des choix de stylisme facial qui restent subordonnés à votre Profil identité.",
    details:
      "Détails",
    detailsHint:
      "Ajoutez seulement ce qui n’est pas déjà défini par les réglages ci-dessus.",
    framing:
      "Cadrage",
    pose:
      "Pose",
    expression:
      "Expression",
    gaze:
      "Regard",
    makeup:
      "Maquillage",
    skin:
      "Peau",
    hair:
      "Cheveux",
    instruction:
      "Ajouter une précision",
    instructionPlaceholder:
      "Exemple : cheveux détachés, regard caméra, ambiance très minimaliste…",
    identity:
      "Votre identité reste prioritaire sur tous les réglages de séance.",
    back:
      "Lumière",
    continue:
      "Choisir les vêtements",
    saving:
      "Enregistrement…",
  },
  es: {
    eyebrow:
      "Paso 3 · Dirección",
    title:
      "Dirige tu sesión.",
    intro:
      "Define el encuadre, la actitud y la apariencia del modelo sin modificar su identidad.",
    session:
      "Sesión",
    sessionHint:
      "Elige el número exacto de fotos. MIRAVA adapta automáticamente el plan de sesión y el coste.",
    shotCount:
      "Número de fotos",
    shotCountHint:
      "1 foto = 1 crédito",
    model:
      "Modelo",
    modelHint:
      "Encuadre, postura y presencia delante de la cámara.",
    appearance:
      "Apariencia",
    appearanceHint:
      "Decisiones de estilismo facial siempre subordinadas a tu Perfil de identidad.",
    details:
      "Detalles",
    detailsHint:
      "Añade únicamente lo que no esté definido por los ajustes anteriores.",
    framing:
      "Encuadre",
    pose:
      "Pose",
    expression:
      "Expresión",
    gaze:
      "Mirada",
    makeup:
      "Maquillaje",
    skin:
      "Piel",
    hair:
      "Cabello",
    instruction:
      "Añadir una precisión",
    instructionPlaceholder:
      "Ejemplo: cabello suelto, mirada a cámara, ambiente muy minimalista…",
    identity:
      "Tu identidad sigue siendo prioritaria sobre todos los ajustes de la sesión.",
    back:
      "Luz",
    continue:
      "Elegir la ropa",
    saving:
      "Guardando…",
  },
} as const

export const SESSION_DIRECTION_OPTIONS = {
  fr: {
    framing: [
      {
        value:
          "PORTRAIT",
        label:
          "Portrait",
      },
      {
        value:
          "BUST",
        label:
          "Buste",
      },
      {
        value:
          "MID_BODY",
        label:
          "Mi-corps",
      },
      {
        value:
          "FULL_BODY",
        label:
          "Plein pied",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    pose: [
      {
        value:
          "STANDING",
        label:
          "Debout",
      },
      {
        value:
          "SEATED",
        label:
          "Assise",
      },
      {
        value:
          "MOVEMENT",
        label:
          "En mouvement",
      },
      {
        value:
          "STATIC_PORTRAIT",
        label:
          "Portrait statique",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    expression: [
      {
        value:
          "NEUTRAL",
        label:
          "Neutre",
      },
      {
        value:
          "SOFT_SMILE",
        label:
          "Sourire léger",
      },
      {
        value:
          "SMILE",
        label:
          "Sourire",
      },
      {
        value:
          "SERIOUS",
        label:
          "Sérieuse",
      },
      {
        value:
          "CONFIDENT",
        label:
          "Confiance",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    gaze: [
      {
        value:
          "CAMERA",
        label:
          "Caméra",
      },
      {
        value:
          "OFF_CAMERA",
        label:
          "Hors caméra",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    makeup: [
      {
        value:
          "NONE",
        label:
          "Aucun",
      },
      {
        value:
          "NATURAL",
        label:
          "Naturel",
      },
      {
        value:
          "LIGHT",
        label:
          "Léger",
      },
      {
        value:
          "STRONG",
        label:
          "Soutenu",
      },
    ],
    skinFinish: [
      {
        value:
          "NATURAL",
        label:
          "Naturelle",
      },
      {
        value:
          "SMOOTH",
        label:
          "Lisse",
      },
      {
        value:
          "EDITORIAL",
        label:
          "Éditoriale",
      },
    ],
    hair: [
      {
        value:
          "PROFILE",
        label:
          "Comme mon profil",
      },
      {
        value:
          "LOOSE",
        label:
          "Détachés",
      },
      {
        value:
          "TIED",
        label:
          "Attachés",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
  },
  es: {
    framing: [
      {
        value:
          "PORTRAIT",
        label:
          "Retrato",
      },
      {
        value:
          "BUST",
        label:
          "Busto",
      },
      {
        value:
          "MID_BODY",
        label:
          "Medio cuerpo",
      },
      {
        value:
          "FULL_BODY",
        label:
          "Cuerpo entero",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    pose: [
      {
        value:
          "STANDING",
        label:
          "De pie",
      },
      {
        value:
          "SEATED",
        label:
          "Sentada",
      },
      {
        value:
          "MOVEMENT",
        label:
          "En movimiento",
      },
      {
        value:
          "STATIC_PORTRAIT",
        label:
          "Retrato estático",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    expression: [
      {
        value:
          "NEUTRAL",
        label:
          "Neutra",
      },
      {
        value:
          "SOFT_SMILE",
        label:
          "Sonrisa ligera",
      },
      {
        value:
          "SMILE",
        label:
          "Sonrisa",
      },
      {
        value:
          "SERIOUS",
        label:
          "Seria",
      },
      {
        value:
          "CONFIDENT",
        label:
          "Confianza",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    gaze: [
      {
        value:
          "CAMERA",
        label:
          "Cámara",
      },
      {
        value:
          "OFF_CAMERA",
        label:
          "Fuera de cámara",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
    makeup: [
      {
        value:
          "NONE",
        label:
          "Ninguno",
      },
      {
        value:
          "NATURAL",
        label:
          "Natural",
      },
      {
        value:
          "LIGHT",
        label:
          "Ligero",
      },
      {
        value:
          "STRONG",
        label:
          "Intenso",
      },
    ],
    skinFinish: [
      {
        value:
          "NATURAL",
        label:
          "Natural",
      },
      {
        value:
          "SMOOTH",
        label:
          "Suave",
      },
      {
        value:
          "EDITORIAL",
        label:
          "Editorial",
      },
    ],
    hair: [
      {
        value:
          "PROFILE",
        label:
          "Como mi perfil",
      },
      {
        value:
          "LOOSE",
        label:
          "Suelto",
      },
      {
        value:
          "TIED",
        label:
          "Recogido",
      },
      {
        value:
          "FREE",
        label:
          "Libre",
      },
    ],
  },
} as const

export function updateMiravaSessionDirectionState<
  Key extends
    Exclude<
      keyof MiravaSessionDirectionState,
      "userInstruction"
    >,
>(
  state:
    MiravaSessionDirectionState,
  key:
    Key,
  value:
    MiravaSessionDirectionState[
      Key
    ],
): MiravaSessionDirectionState {
  return {
    ...state,
    [key]:
      value,
  } as
    MiravaSessionDirectionState
}

export function createMiravaSessionDirectionPatch(
  state:
    MiravaSessionDirectionState,
): MiravaSessionBuilderClientPatch {
  return {
    framing:
      state.framing,
    pose:
      state.pose,
    expression:
      state.expression,
    gaze:
      state.gaze,
    makeup:
      state.makeup,
    skinFinish:
      state.skinFinish,
    hair:
      state.hair,
    userInstruction:
      state.userInstruction,
  }
}

function Choice({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={
        selected
      }
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={cn(
        "min-h-[42px] rounded-full border px-4 py-2 font-jakarta text-xs font-medium transition-all duration-200",
        selected
          ? "border-[#d8c7b4]/55 bg-[#d8c7b4]/12 text-[#f2ece5] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-white/[0.025] text-white/55 hover:border-white/18 hover:bg-white/[0.045] hover:text-white/78",
        disabled &&
          "cursor-wait opacity-45",
      )}
    >
      <span className="flex items-center gap-2">
        {selected ? (
          <Check className="h-3 w-3" />
        ) : null}
        {
          label
        }
      </span>
    </button>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children:
    React.ReactNode
}) {
  return (
    <div>
      <span className="font-jakarta text-[10px] font-semibold text-white/48">
        {
          title
        }
      </span>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {
          children
        }
      </div>
    </div>
  )
}

export function SessionDirectionStep({
  locale,
  config,
  saving = false,
  onChange,
  onBack,
  onContinue,
}: SessionDirectionStepProps) {
  const reduceMotion =
    useReducedMotion()

  const copy =
    SESSION_DIRECTION_COPY[
      locale
    ]

  const options =
    SESSION_DIRECTION_OPTIONS[
      locale
    ]

  const [
    draft,
    setDraft,
  ] = useState<
    MiravaSessionDirectionState
  >(
    config,
  )

  const [
    shotCount,
    setShotCount,
  ] = useState<
    MiravaSessionBuilderV2Options[
      "shotCount"
    ]
  >(
    config.shotCount,
  )

  const select =
    <
      Key extends
        Exclude<
          keyof MiravaSessionDirectionState,
          "userInstruction"
        >,
    >(
      key: Key,
      value:
        MiravaSessionDirectionState[
          Key
        ],
    ) => {
      if (saving) {
        return
      }

      const next =
        updateMiravaSessionDirectionState(
          draft,
          key,
          value,
        )

      setDraft(
        next,
      )
    }

  const selectShotCount =
    (
      nextShotCount:
        MiravaSessionBuilderV2Options[
          "shotCount"
        ],
    ) => {
      if (
        saving ||
        nextShotCount ===
          shotCount
      ) {
        return
      }

      setShotCount(
        nextShotCount,
      )

      void onChange({
        shotCount:
          nextShotCount,
      }).catch(
        () => undefined,
      )
    }

  const fullPatch =
    () =>
      createMiravaSessionDirectionPatch(
        draft,
      )

  return (
    <section
      data-testid="mirava-session-direction-step"
      className="relative min-h-full w-full bg-[#0d0e0e] text-[#f1f1ed]"
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
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

          <h1 className="mt-3 max-w-3xl font-jakarta text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#f3f1ec] sm:text-[40px] lg:text-[46px]">
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

        <div
          data-mirava-shot-count-selector
          className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6"
        >
          <div>
            <h2 className="font-jakarta text-base font-semibold text-white">
              {
                copy.session
              }
            </h2>

            <p className="mt-1 font-jakarta text-[11px] leading-5 text-white/42">
              {
                copy.sessionHint
              }
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="font-jakarta text-[10px] font-semibold text-white/48">
                {
                  copy.shotCount
                }
              </span>

              <span className="font-jakarta text-[10px] text-white/35">
                {
                  copy.shotCountHint
                }
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {
                MIRAVA_SESSION_SELECTABLE_SHOT_COUNTS.map(
                  (
                    value,
                  ) => (
                    <Choice
                      key={
                        value
                      }
                      label={
                        String(
                          value,
                        )
                      }
                      selected={
                        shotCount ===
                        value
                      }
                      disabled={
                        saving
                      }
                      onClick={() =>
                        selectShotCount(
                          value,
                        )
                      }
                    />
                  ),
                )
              }
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/20 text-[#c9b7a3]">
                <SlidersHorizontal className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-jakarta text-base font-semibold text-white">
                  {
                    copy.model
                  }
                </h2>

                <p className="mt-1 font-jakarta text-[11px] leading-5 text-white/42">
                  {
                    copy.modelHint
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <Group
                title={
                  copy.framing
                }
              >
                {options.framing.map(
                  (
                    option,
                  ) => (
                    <Choice
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draft.framing ===
                        option.value
                      }
                      disabled={
                        saving
                      }
                      onClick={() =>
                        select(
                          "framing",
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </Group>

              <Group
                title={
                  copy.pose
                }
              >
                {options.pose.map(
                  (
                    option,
                  ) => (
                    <Choice
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draft.pose ===
                        option.value
                      }
                      disabled={
                        saving
                      }
                      onClick={() =>
                        select(
                          "pose",
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </Group>

              <Group
                title={
                  copy.expression
                }
              >
                {options.expression.map(
                  (
                    option,
                  ) => (
                    <Choice
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draft.expression ===
                        option.value
                      }
                      disabled={
                        saving
                      }
                      onClick={() =>
                        select(
                          "expression",
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </Group>

              <Group
                title={
                  copy.gaze
                }
              >
                {options.gaze.map(
                  (
                    option,
                  ) => (
                    <Choice
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        draft.gaze ===
                        option.value
                      }
                      disabled={
                        saving
                      }
                      onClick={() =>
                        select(
                          "gaze",
                          option.value,
                        )
                      }
                    />
                  ),
                )}
              </Group>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/20 text-[#c9b7a3]">
                  <Sparkles className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="font-jakarta text-base font-semibold text-white">
                    {
                      copy.appearance
                    }
                  </h2>

                  <p className="mt-1 font-jakarta text-[11px] leading-5 text-white/42">
                    {
                      copy.appearanceHint
                    }
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <Group
                  title={
                    copy.makeup
                  }
                >
                  {options.makeup.map(
                    (
                      option,
                    ) => (
                      <Choice
                        key={
                          option.value
                        }
                        label={
                          option.label
                        }
                        selected={
                          draft.makeup ===
                          option.value
                        }
                        disabled={
                          saving
                        }
                        onClick={() =>
                          select(
                            "makeup",
                            option.value,
                          )
                        }
                      />
                    ),
                  )}
                </Group>

                <Group
                  title={
                    copy.skin
                  }
                >
                  {options.skinFinish.map(
                    (
                      option,
                    ) => (
                      <Choice
                        key={
                          option.value
                        }
                        label={
                          option.label
                        }
                        selected={
                          draft.skinFinish ===
                          option.value
                        }
                        disabled={
                          saving
                        }
                        onClick={() =>
                          select(
                            "skinFinish",
                            option.value,
                          )
                        }
                      />
                    ),
                  )}
                </Group>

                <Group
                  title={
                    copy.hair
                  }
                >
                  {options.hair.map(
                    (
                      option,
                    ) => (
                      <Choice
                        key={
                          option.value
                        }
                        label={
                          option.label
                        }
                        selected={
                          draft.hair ===
                          option.value
                        }
                        disabled={
                          saving
                        }
                        onClick={() =>
                          select(
                            "hair",
                            option.value,
                          )
                        }
                      />
                    ),
                  )}
                </Group>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
              <h2 className="font-jakarta text-base font-semibold text-white">
                {
                  copy.details
                }
              </h2>

              <p className="mt-1 font-jakarta text-[11px] leading-5 text-white/42">
                {
                  copy.detailsHint
                }
              </p>

              <label className="mt-5 block">
                <span className="font-jakarta text-[10px] font-semibold text-white/48">
                  {
                    copy.instruction
                  }
                </span>

                <textarea
                  value={
                    draft.userInstruction
                  }
                  maxLength={
                    MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS
                  }
                  disabled={
                    saving
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          userInstruction:
                            event.target.value,
                        }),
                      )
                  }
                  placeholder={
                    copy.instructionPlaceholder
                  }
                  className="mt-2 min-h-[112px] w-full resize-none rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 font-jakarta text-sm leading-6 text-white outline-none transition placeholder:text-white/22 focus:border-[#d8c7b4]/40 focus:bg-black/25 disabled:opacity-45"
                />

                <span className="mt-2 block text-right font-jakarta text-[9px] tabular-nums text-white/28">
                  {
                    draft.userInstruction.length
                  }/
                  {
                    MIRAVA_SESSION_USER_INSTRUCTION_MAX_CHARS
                  }
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#d8c7b4]/12 bg-[#d8c7b4]/[0.035] px-4 py-3 font-jakarta text-[10px] leading-5 text-[#d8c7b4]/65">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>
            {
              copy.identity
            }
          </span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0e0e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:sticky lg:bottom-0 lg:bg-[#0d0e0e]/92 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3">
          <button
            type="button"
            disabled={
              saving
            }
            onClick={() =>
              onBack(
                fullPatch(),
              )
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

          <button
            type="button"
            disabled={
              saving
            }
            onClick={() =>
              onContinue(
                fullPatch(),
              )
            }
            className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#ede8df] px-5 font-jakarta text-sm font-semibold text-[#101111] transition hover:bg-white active:scale-[0.985] disabled:cursor-wait disabled:opacity-55 sm:px-6"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}

            <span>
              {saving
                ? copy.saving
                : copy.continue}
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default SessionDirectionStep
