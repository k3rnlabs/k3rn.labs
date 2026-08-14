"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"
import {
  AlertCircle,
  Loader2,
} from "lucide-react"

import {
  isMiravaSessionBuilderReady,
  type MiravaSessionLookMode,
} from "@/lib/mirava/session-builder/schema"
import {
  type MiravaLightingPresetId,
} from "@/lib/mirava/session-builder/lighting-presets"
import {
  type MiravaSetPresetId,
} from "@/lib/mirava/session-builder/set-presets"
import {
  getMiravaSessionBuilderClientSession,
  parseMiravaSessionBuilderClientSession,
  patchMiravaSessionBuilderClientSession,
  type MiravaSessionBuilderClientPatch,
  type MiravaSessionBuilderClientSession,
} from "@/lib/mirava/session-builder/session-builder.client"
import {
  MIRAVA_SESSION_BUILDER_RESUME_STEPS,
  type MiravaSessionBuilderResumeStep,
} from "@/lib/mirava/session-builder/session-progress"

import {
  SessionSetStep,
} from "./session-set-step"
import {
  SessionLightingStep,
} from "./session-lighting-step"
import {
  SessionDirectionStep,
} from "./session-direction-step"
import {
  SessionLookStep,
} from "./session-look-step"
import {
  SessionReviewStep,
} from "./session-review-step"

type Locale =
  | "fr"
  | "es"

export const MIRAVA_SESSION_BUILDER_STEPS =
  MIRAVA_SESSION_BUILDER_RESUME_STEPS

export type MiravaSessionBuilderStep =
  (typeof MIRAVA_SESSION_BUILDER_STEPS)[number]

type SessionBuilderFlowProps = {
  locale: Locale
  sessionId: string
  initialSession?:
    MiravaSessionBuilderClientSession
  availableCredits?:
    | number
    | null
  launchEnabled?: boolean
  setPreviewImages?:
    Partial<
      Record<
        MiravaSetPresetId,
        string
      >
    >
  lightingPreviewImages?:
    Partial<
      Record<
        MiravaLightingPresetId,
        string
      >
    >
  onExit: () => void
  onStepChange?: () => void
  onStart:
    (
      session:
        MiravaSessionBuilderClientSession,
    ) =>
      | void
      | Promise<void>
}

export const SESSION_BUILDER_FLOW_COPY = {
  fr: {
    loading:
      "Reprise de votre séance…",
    loadError:
      "Impossible de reprendre cette séance MIRAVA.",
    saveError:
      "Impossible d’enregistrer cette étape.",
    reviewError:
      "La séance n’est pas encore prête.",
    startError:
      "Impossible de démarrer cette séance.",
  },
  es: {
    loading:
      "Recuperando tu sesión…",
    loadError:
      "No se pudo recuperar esta sesión de MIRAVA.",
    saveError:
      "No se pudo guardar este paso.",
    reviewError:
      "La sesión todavía no está lista.",
    startError:
      "No se pudo iniciar esta sesión.",
  },
} as const

export function resolveMiravaSessionBuilderStep(
  session:
    MiravaSessionBuilderClientSession,
): MiravaSessionBuilderStep {
  if (
    !session.config
      .setPresetId
  ) {
    return "SET"
  }

  if (
    !session.config
      .lightingPresetId
  ) {
    return "LIGHTING"
  }

  if (
    session.resumeStep ===
      "REVIEW" &&
    !canReviewMiravaSessionBuilderSession(
      session,
    )
  ) {
    return "LOOK"
  }

  return (
    session.resumeStep ??
    "DIRECTION"
  )
}

export function mergeMiravaSessionAfterLookMutation(
  current:
    MiravaSessionBuilderClientSession,
  value: unknown,
): MiravaSessionBuilderClientSession {
  const updated =
    parseMiravaSessionBuilderClientSession(
      value,
    )

  return {
    ...updated,
    config: {
      ...updated.config,
      framing:
        current.config.framing,
      pose:
        current.config.pose,
      expression:
        current.config.expression,
      gaze:
        current.config.gaze,
      makeup:
        current.config.makeup,
      skinFinish:
        current.config.skinFinish,
      hair:
        current.config.hair,
      userInstruction:
        current.config.userInstruction,
    },
  }
}

export function canReviewMiravaSessionBuilderSession(
  session:
    MiravaSessionBuilderClientSession,
): boolean {
  return (
    session.configurationReady &&
    isMiravaSessionBuilderReady(
      session.config,
    )
  )
}

export function SessionBuilderFlow({
  locale,
  sessionId,
  initialSession,
  availableCredits = null,
  launchEnabled = true,
  setPreviewImages,
  lightingPreviewImages,
  onExit,
  onStepChange,
  onStart,
}: SessionBuilderFlowProps) {
  const copy =
    SESSION_BUILDER_FLOW_COPY[
      locale
    ]

  const [
    session,
    setSession,
  ] = useState<
    MiravaSessionBuilderClientSession
    | null
  >(
    initialSession ??
      null,
  )

  const [
    step,
    setStep,
  ] = useState<
    MiravaSessionBuilderStep
  >(
    initialSession
      ? resolveMiravaSessionBuilderStep(
          initialSession,
        )
      : "SET",
  )

  const [
    selectedSetPresetId,
    setSelectedSetPresetId,
  ] = useState<
    | MiravaSetPresetId
    | null
  >(
    initialSession?.config
      .setPresetId ??
      null,
  )

  const [
    selectedLightingPresetId,
    setSelectedLightingPresetId,
  ] = useState<
    | MiravaLightingPresetId
    | null
  >(
    initialSession?.config
      .lightingPresetId ??
      null,
  )

  const [
    loading,
    setLoading,
  ] = useState(
    !initialSession,
  )

  const [
    saving,
    setSaving,
  ] = useState(false)

  const directionSaveQueueRef =
    useRef<Promise<void>>(
      Promise.resolve(),
    )

  const [
    startBusy,
    setStartBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null)

  useEffect(
    () => {
      if (
        initialSession
      ) {
        return
      }

      let cancelled =
        false

      void getMiravaSessionBuilderClientSession(
        sessionId,
      )
        .then(
          (
            loaded,
          ) => {
            if (
              cancelled
            ) {
              return
            }

            setSession(
              loaded,
            )

            setSelectedSetPresetId(
              loaded.config
                .setPresetId,
            )

            setSelectedLightingPresetId(
              loaded.config
                .lightingPresetId,
            )

            setStep(
              resolveMiravaSessionBuilderStep(
                loaded,
              ),
            )

            setError(
              null,
            )
          },
        )
        .catch(
          () => {
            if (
              !cancelled
            ) {
              setError(
                copy.loadError,
              )
            }
          },
        )
        .finally(
          () => {
            if (
              !cancelled
            ) {
              setLoading(
                false,
              )
            }
          },
        )

      return () => {
        cancelled =
          true
      }
    },
    [
      copy.loadError,
      initialSession,
      sessionId,
    ],
  )

  useEffect(
    () => {
      onStepChange?.()
    },
    [
      onStepChange,
      step,
    ],
  )

  const persist =
    async (
      patch:
        MiravaSessionBuilderClientPatch,
    ) => {
      if (!session) {
        throw new Error(
          "MIRAVA_SESSION_FLOW_MISSING_SESSION",
        )
      }

      const updated =
        await patchMiravaSessionBuilderClientSession(
          session.id,
          patch,
        )

      setSession(
        updated,
      )

      return updated
    }

  const rememberStep =
    async (
      next:
        MiravaSessionBuilderResumeStep,
    ) => {
      if (saving) {
        return
      }

      setSaving(true)
      setError(null)

      try {
        await persist({
          resumeStep:
            next,
        })

        setStep(
          next,
        )
      } catch {
        setError(
          copy.saveError,
        )
      } finally {
        setSaving(false)
      }
    }

  const continueSet =
    async () => {
      if (
        !selectedSetPresetId ||
        saving
      ) {
        return
      }

      setSaving(true)
      setError(null)

      try {
        await persist({
          setPresetId:
            selectedSetPresetId,
          resumeStep:
            "LIGHTING",
        })

        setStep(
          "LIGHTING",
        )
      } catch {
        setError(
          copy.saveError,
        )
      } finally {
        setSaving(false)
      }
    }

  const continueLighting =
    async () => {
      if (
        !selectedLightingPresetId ||
        saving
      ) {
        return
      }

      setSaving(true)
      setError(null)

      try {
        await persist({
          lightingPresetId:
            selectedLightingPresetId,
          resumeStep:
            "DIRECTION",
        })

        setStep(
          "DIRECTION",
        )
      } catch {
        setError(
          copy.saveError,
        )
      } finally {
        setSaving(false)
      }
    }

  const persistDirection =
    (
      patch:
        MiravaSessionBuilderClientPatch,
    ): Promise<void> => {
      if (!session) {
        return Promise.reject(
          new Error(
            "MIRAVA_SESSION_FLOW_MISSING_SESSION",
          ),
        )
      }

      const currentSessionId =
        session.id

      setError(null)

      const queuedSave =
        directionSaveQueueRef
          .current
          .catch(
            () =>
              undefined,
          )
          .then(
            async () => {
              const updated =
                await patchMiravaSessionBuilderClientSession(
                  currentSessionId,
                  {
                    ...patch,
                    resumeStep:
                      "DIRECTION",
                  },
                )

              setSession(
                (
                  current,
                ) => {
                  if (
                    !current ||
                    current.id !==
                      updated.id
                  ) {
                    return current
                  }

                  return {
                    ...updated,
                    lookItems:
                      updated.lookItems ??
                      current.lookItems,
                  }
                },
              )
            },
          )

      directionSaveQueueRef.current =
        queuedSave

      return queuedSave.catch(
        (
          directionError,
        ) => {
          setError(
            copy.saveError,
          )

          throw directionError
        },
      )
    }

  const moveFromDirection =
    async (
      patch:
        MiravaSessionBuilderClientPatch,
      next:
        | "LIGHTING"
        | "LOOK",
    ) => {
      if (saving) {
        return
      }

      setSaving(true)
      setError(null)

      try {
        await directionSaveQueueRef
          .current

        await persist({
          ...patch,
          resumeStep:
            next,
        })

        setStep(
          next,
        )
      } catch {
        setError(
          copy.saveError,
        )
      } finally {
        setSaving(false)
      }
    }

  const changeLookMode =
    async (
      mode:
        MiravaSessionLookMode,
    ) => {
      setError(null)

      try {
        await persist({
          lookMode:
            mode,
          resumeStep:
            "LOOK",
        })
      } catch (
        modeError
      ) {
        setError(
          copy.saveError,
        )

        throw modeError
      }
    }

  const continueLook =
    async () => {
      if (
        !session ||
        saving ||
        !canReviewMiravaSessionBuilderSession(
          session,
        )
      ) {
        if (
          !session ||
          !canReviewMiravaSessionBuilderSession(
            session,
          )
        ) {
          setError(
            copy.reviewError,
          )
        }

        return
      }

      setSaving(true)
      setError(null)

      try {
        await persist({
          resumeStep:
            "REVIEW",
        })

        setStep(
          "REVIEW",
        )
      } catch {
        setError(
          copy.saveError,
        )
      } finally {
        setSaving(false)
      }
    }

  const handleLookSessionChange =
    (
      value: unknown,
    ) => {
      setSession(
        (
          current,
        ) => {
          if (!current) {
            return parseMiravaSessionBuilderClientSession(
              value,
            )
          }

          return mergeMiravaSessionAfterLookMutation(
            current,
            value,
          )
        },
      )
    }

  const handleStart =
    async () => {
      if (
        !session ||
        startBusy
      ) {
        return
      }

      setStartBusy(true)
      setError(null)

      try {
        await onStart(
          session,
        )
      } catch {
        setError(
          copy.startError,
        )
      } finally {
        setStartBusy(false)
      }
    }

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[440px] w-full items-center justify-center bg-[#0d0e0e] px-6 text-[#f1f1ed]">
        <div className="flex items-center gap-3 font-jakarta text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {
              copy.loading
            }
          </span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[440px] w-full items-center justify-center bg-[#0d0e0e] px-6 text-[#f1f1ed]">
        <div
          role="alert"
          className="flex max-w-md items-start gap-3 rounded-[22px] border border-red-300/15 bg-red-300/[0.045] px-5 py-4 font-jakarta text-sm leading-6 text-red-100/70"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error ??
              copy.loadError}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full w-full bg-[#0d0e0e]">
      {step ===
      "SET" ? (
        <SessionSetStep
          locale={
            locale
          }
          shotCount={
            session.config
              .shotCount
          }
          selectedSetPresetId={
            selectedSetPresetId
          }
          onSelect={
            setSelectedSetPresetId
          }
          onBack={
            onExit
          }
          onContinue={() =>
            void continueSet()
          }
          continueBusy={
            saving
          }
          previewImages={
            setPreviewImages
          }
        />
      ) : null}

      {step ===
      "LIGHTING" ? (
        <SessionLightingStep
          locale={
            locale
          }
          shotCount={
            session.config
              .shotCount
          }
          setPresetId={
            selectedSetPresetId ??
            session.config
              .setPresetId!
          }
          selectedLightingPresetId={
            selectedLightingPresetId
          }
          onSelect={
            setSelectedLightingPresetId
          }
          onBack={() =>
            void rememberStep(
              "SET",
            )
          }
          onContinue={() =>
            void continueLighting()
          }
          continueBusy={
            saving
          }
          previewImages={
            lightingPreviewImages
          }
        />
      ) : null}

      {step ===
      "DIRECTION" ? (
        <SessionDirectionStep
          locale={
            locale
          }
          config={
            session.config
          }
          saving={
            saving
          }
          onChange={
            persistDirection
          }
          onBack={
            (
              patch,
            ) =>
              void moveFromDirection(
                patch,
                "LIGHTING",
              )
          }
          onContinue={
            (
              patch,
            ) =>
              void moveFromDirection(
                patch,
                "LOOK",
              )
          }
        />
      ) : null}

      {step ===
      "LOOK" ? (
        <SessionLookStep
          locale={
            locale
          }
          shotCount={
            session.config
              .shotCount
          }
          sessionId={
            session.id
          }
          lookMode={
            session.config
              .lookMode
          }
          initialLookItems={
            session.lookItems ??
            []
          }
          persistedLookItemCount={
            session.lookItemCount
          }
          persistedCustomLookReady={
            session.config
              .lookMode ===
              "CUSTOM" &&
            session.configurationReady
          }
          onLookModeChange={
            changeLookMode
          }
          onSessionChange={
            handleLookSessionChange
          }
          onBack={() =>
            void rememberStep(
              "DIRECTION",
            )
          }
          onContinue={
            continueLook
          }
          continueBusy={
            saving
          }
        />
      ) : null}

      {step ===
        "REVIEW" &&
      isMiravaSessionBuilderReady(
        session.config,
      ) ? (
        <SessionReviewStep
          locale={
            locale
          }
          config={
            session.config
          }
          configurationReady={
            session.configurationReady
          }
          lookItems={
            session.lookItems ??
            []
          }
          lookItemCount={
            session.lookItemCount
          }
          setPreviewImages={
            setPreviewImages
          }
          lightingPreviewImages={
            lightingPreviewImages
          }
          creditCost={
            session.config
              .shotCount
          }
          availableCredits={
            availableCredits
          }
          launchEnabled={
            launchEnabled
          }
          onBack={() =>
            void rememberStep(
              "LOOK",
            )
          }
          onStart={() =>
            void handleStart()
          }
          startBusy={
            startBusy
          }
        />
      ) : null}

      {error &&
      session ? (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] mx-auto max-w-xl">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-300/15 bg-[#251919]/95 px-4 py-3 font-jakarta text-xs leading-5 text-red-100/80 shadow-2xl backdrop-blur-xl"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SessionBuilderFlow
