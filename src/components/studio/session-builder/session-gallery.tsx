"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Download, Loader2, Sparkles } from "lucide-react"

export type MiravaSessionGalleryLocale = "fr" | "es"

export type MiravaSessionGalleryStatus = {
  sessionId: string
  shotCount: number
  completedCount: number
  failedCount: number
  activeCount: number
  status: "QUEUED" | "GENERATING" | "PARTIAL" | "COMPLETED" | "FAILED"
  studioCredits: number
  shots: Array<{
    creationId: string
    shotIndex: number
    shotIntent: string | null
    status: string
    resultUrl: string | null
    failureKind: string | null
    failureMessage: string | null
    continuationActive: boolean
    continuationKind: "REGENERATE" | "POSE" | null
    continuationFailureMessage: string | null
  }>
}

const galleryCopy = {
  fr: {
    eyebrow: "CHAMBRE NOIRE",
    title: "Votre séance se révèle.",
    preparing: "Préparation des six prises…",
    ready: (completed: number, total: number) => `${completed}/${total} photos prêtes`,
    status: {
      QUEUED: "En préparation",
      GENERATING: "En révélation",
      PARTIAL: "Résultats progressifs",
      COMPLETED: "Séance révélée",
      FAILED: "Séance à reprendre",
    },
    retry: "Impossible d’actualiser la séance. Nouvelle tentative en cours.",
    failed: "Cette prise n’a pas abouti.",
    pending: (shot: number) => `Prise ${shot} · en cours`,
    regeneratePending: "Nouvelle version en cours…",
    posePending: "Nouvelle pose en cours…",
    continuationFailed: "La nouvelle prise n’a pas abouti. Votre photo précédente reste disponible.",
    photoAlt: (shot: number) => `Photo ${shot}`,
    download: (shot: number) => `Télécharger la photo ${shot}`,
    regenerate: (shot: number) => `Régénérer la photo ${shot}`,
    pose: "Nouvelle pose",
    continuationRequestFailed: "Impossible de préparer cette nouvelle prise.",
    background: "Vous pouvez quitter cet écran : MIRAVA poursuit la révélation en privé.",
  },
  es: {
    eyebrow: "CUARTO OSCURO",
    title: "Tu sesión se revela.",
    preparing: "Preparando las seis imágenes…",
    ready: (completed: number, total: number) => `${completed}/${total} fotos listas`,
    status: {
      QUEUED: "En preparación",
      GENERATING: "En revelado",
      PARTIAL: "Resultados progresivos",
      COMPLETED: "Sesión revelada",
      FAILED: "Sesión por retomar",
    },
    retry: "No se ha podido actualizar la sesión. Se reintentará automáticamente.",
    failed: "Esta imagen no se ha podido completar.",
    pending: (shot: number) => `Imagen ${shot} · en proceso`,
    regeneratePending: "Nueva versión en proceso…",
    posePending: "Nueva pose en proceso…",
    continuationFailed: "La nueva toma no se ha completado. Tu foto anterior sigue disponible.",
    photoAlt: (shot: number) => `Foto ${shot}`,
    download: (shot: number) => `Descargar la foto ${shot}`,
    regenerate: (shot: number) => `Regenerar la foto ${shot}`,
    pose: "Nueva pose",
    continuationRequestFailed: "No se ha podido preparar esta nueva toma.",
    background: "Puedes salir de esta pantalla: MIRAVA sigue revelando en privado.",
  },
} as const

export function isSessionGalleryTerminal(status: MiravaSessionGalleryStatus): boolean {
  return !status.shots.some((shot) => shot.continuationActive)
    && status.completedCount + status.failedCount === status.shotCount
}

export function sessionResultDownloadUrl(resultUrl: string): string {
  const url = new URL(resultUrl, "https://mirava.local")
  url.searchParams.set("download", "1")
  return url.origin === "https://mirava.local"
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString()
}

function darkroomSlotClass(ready: boolean): string {
  return ready
    ? "border-white/20 bg-white/[0.08]"
    : "border-white/10 bg-[#090a09]"
}

export function SessionGallery({
  locale,
  sessionId,
}: {
  locale: MiravaSessionGalleryLocale
  sessionId: string
}) {
  const copy = galleryCopy[locale]
  const [session, setSession] = useState<MiravaSessionGalleryStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refreshSession = useCallback(async (): Promise<MiravaSessionGalleryStatus> => {
    const response = await fetch(`/api/visual-engine/sessions/${encodeURIComponent(sessionId)}/shoot`, {
      cache: "no-store",
      credentials: "same-origin",
    })
    const payload = await response.json().catch(() => ({})) as {
      session?: MiravaSessionGalleryStatus
    }
    if (!response.ok || !payload.session) throw new Error("MIRAVA_SESSION_STATUS_FAILED")
    setSession(payload.session)
    setError(null)
    return payload.session
  }, [sessionId])

  const continueShot = async (shotIndex: number, pose: boolean) => {
    setActioning(`${shotIndex}:${pose ? "pose" : "regen"}`)
    try {
      const response = await fetch(`/api/visual-engine/sessions/${encodeURIComponent(sessionId)}/shots/${shotIndex}/continue`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: pose ? "POSE" : "REGENERATE" }),
      })
      if (!response.ok) throw new Error("MIRAVA_SESSION_CONTINUATION_FAILED")
      await refreshSession()
      setRefreshNonce((value) => value + 1)
    } catch {
      setError(copy.continuationRequestFailed)
    } finally {
      setActioning(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = async () => {
      try {
        const next = await refreshSession()
        if (!cancelled && !isSessionGalleryTerminal(next)) timer = setTimeout(poll, 2500)
      } catch {
        if (!cancelled) {
          setError(copy.retry)
          timer = setTimeout(poll, 5000)
        }
      }
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [copy.retry, refreshNonce, refreshSession])

  const total = session?.shotCount ?? 6
  const shots = [...(session?.shots ?? Array.from({ length: total }, (_, shotIndex) => ({
    creationId: "", shotIndex, shotIntent: null, status: "GENERATION_QUEUED", resultUrl: null,
    failureKind: null, failureMessage: null, continuationActive: false,
    continuationKind: null, continuationFailureMessage: null,
  })))].sort((a, b) => a.shotIndex - b.shotIndex)

  return <section className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:py-10" data-mirava-session-gallery>
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070807] px-4 py-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-9">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 50% 5%, rgba(214,207,185,0.15), transparent 32%), radial-gradient(circle at 10% 90%, rgba(154,143,116,0.08), transparent 35%)" }} />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">{copy.eyebrow}</p>
          <h1 className="mt-3 font-jakarta text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-white/58">{session ? copy.ready(session.completedCount, total) : copy.preparing}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{copy.status[session?.status ?? "QUEUED"]}</span>
      </div>
      <div className="relative mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-mirava-accent transition-[width] duration-500" style={{ width: `${((session?.completedCount ?? 0) / total) * 100}%` }} /></div>
      {error ? <p role="alert" className="relative mt-4 flex items-center gap-2 text-sm text-red-200"><AlertCircle className="h-4 w-4" />{error}</p> : null}
      <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shots.map((shot) => <article key={shot.shotIndex} className={`relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border ${darkroomSlotClass(Boolean(shot.resultUrl))}`}>
          {!shot.resultUrl ? <><div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(180,154,104,0.22),transparent_35%),linear-gradient(160deg,#101210_0%,#080908_52%,#0d0f0d_100%)]" /><div aria-hidden="true" className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.82) 0.55px, transparent 0.8px)", backgroundSize: "5px 5px" }} /></> : null}
          {shot.resultUrl ? <img src={shot.resultUrl} alt={copy.photoAlt(shot.shotIndex + 1)} className="h-full w-full object-cover" /> : shot.status === "FAILED" ? <div className="relative flex h-full flex-col items-center justify-center p-4 text-center text-red-100"><AlertCircle className="h-5 w-5" /><span className="mt-2 text-xs">{copy.failed}</span></div> : <div className="relative flex h-full flex-col items-center justify-center text-white/65"><Loader2 className="h-5 w-5 animate-spin" /><span className="mt-3 text-xs">{copy.pending(shot.shotIndex + 1)}</span></div>}
          <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] text-white">{shot.shotIndex + 1}/{total}</span>
          {shot.continuationActive ? <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] text-white">{shot.continuationKind === "POSE" ? copy.posePending : copy.regeneratePending}</span> : null}
          {!shot.continuationActive && shot.continuationFailureMessage ? <span role="status" className="absolute bottom-2 left-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] leading-4 text-amber-100">{copy.continuationFailed}</span> : null}
          {shot.resultUrl ? <div className="absolute bottom-2 right-2 flex gap-1"><a href={sessionResultDownloadUrl(shot.resultUrl)} download className="grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white" aria-label={copy.download(shot.shotIndex + 1)}><Download className="h-4 w-4" /></a><button type="button" disabled={Boolean(actioning) || shot.continuationActive} onClick={() => void continueShot(shot.shotIndex, false)} className="grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white disabled:opacity-50" aria-label={copy.regenerate(shot.shotIndex + 1)}><Sparkles className="h-4 w-4" /></button><button type="button" disabled={Boolean(actioning) || shot.continuationActive} onClick={() => void continueShot(shot.shotIndex, true)} className="rounded-full bg-black/65 px-2 text-[10px] text-white disabled:opacity-50">{copy.pose}</button></div> : null}
        </article>)}
      </div>
      <p className="relative mt-6 border-t border-white/8 pt-5 text-center text-xs leading-5 text-white/42">{copy.background}</p>
    </div>
  </section>
}
