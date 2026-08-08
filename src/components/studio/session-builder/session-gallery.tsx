"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Download, Loader2, Sparkles } from "lucide-react"

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
  }>
}

function terminal(status: MiravaSessionGalleryStatus): boolean {
  return status.completedCount + status.failedCount === status.shotCount
}

export function SessionGallery({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<MiravaSessionGalleryStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const polling = useRef(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const continueShot = async (creationId: string, pose: boolean) => {
    setActioning(`${creationId}:${pose ? "pose" : "regen"}`)
    try {
      const response = await fetch(`/api/visual-engine/creations/${encodeURIComponent(creationId)}/continue`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pose ? { intents: ["pose"] } : { customInstruction: "Regenerate this exact canonical session shot. Preserve identity, set, lighting, wardrobe, shot role and framing." }),
      })
      if (!response.ok) throw new Error("MIRAVA_SESSION_CONTINUATION_FAILED")
    } catch {
      setError("Impossible de préparer cette nouvelle prise.")
    } finally { setActioning(null) }
  }

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = async () => {
      if (polling.current) return
      polling.current = true
      try {
        const response = await fetch(`/api/visual-engine/sessions/${encodeURIComponent(sessionId)}/shoot`, { cache: "no-store", credentials: "same-origin" })
        const payload = await response.json().catch(() => ({})) as { session?: MiravaSessionGalleryStatus; error?: string }
        if (!response.ok || !payload.session) throw new Error(payload.error ?? "MIRAVA_SESSION_STATUS_FAILED")
        if (cancelled) return
        setSession(payload.session)
        setError(null)
        if (!terminal(payload.session)) timer = setTimeout(poll, 2500)
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "MIRAVA_SESSION_STATUS_FAILED")
          timer = setTimeout(poll, 5000)
        }
      } finally {
        polling.current = false
      }
    }
    void poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [sessionId])

  const shots = session?.shots ?? Array.from({ length: 6 }, (_, shotIndex) => ({ creationId: "", shotIndex, shotIntent: null, status: "GENERATION_QUEUED", resultUrl: null, failureKind: null, failureMessage: null }))
  return <section className="py-6 sm:py-10" data-mirava-session-gallery>
    <p className="mirava-label">MIRAVA / SESSION DARKROOM</p>
    <div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="mirava-section-title text-4xl sm:text-5xl">Votre séance se révèle.</h1><p className="mirava-copy mt-2 text-sm">{session ? `${session.completedCount}/6 photos prêtes` : "Préparation des six prises…"}</p></div><span className="mirava-meta">{session?.status ?? "QUEUED"}</span></div>
    <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-mirava-accent transition-[width] duration-500" style={{ width: `${((session?.completedCount ?? 0) / 6) * 100}%` }} /></div>
    {error ? <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-200"><AlertCircle className="h-4 w-4" />Impossible d’actualiser la séance. Nouvelle tentative en cours.</p> : null}
    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shots.sort((a, b) => a.shotIndex - b.shotIndex).map((shot) => <article key={shot.shotIndex} className="mirava-image-frame relative aspect-[4/5] overflow-hidden bg-mirava-surface-raised">
        {shot.resultUrl ? <img src={shot.resultUrl} alt={`Photo ${shot.shotIndex + 1}`} className="h-full w-full object-cover" /> : shot.status === "FAILED" ? <div className="flex h-full flex-col items-center justify-center p-4 text-center text-red-100"><AlertCircle className="h-5 w-5" /><span className="mt-2 text-xs">Cette prise n’a pas abouti.</span></div> : <div className="flex h-full flex-col items-center justify-center text-white/50"><Loader2 className="h-5 w-5 animate-spin" /><span className="mt-3 text-xs">Prise {shot.shotIndex + 1} · en cours</span></div>}
        <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] text-white">{shot.shotIndex + 1}/6</span>
        {shot.resultUrl ? <div className="absolute bottom-2 right-2 flex gap-1"><a href={`${shot.resultUrl}&download=1`} download className="grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white" aria-label={`Télécharger la photo ${shot.shotIndex + 1}`}><Download className="h-4 w-4" /></a><button type="button" disabled={Boolean(actioning)} onClick={() => void continueShot(shot.creationId, false)} className="grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white disabled:opacity-50" aria-label={`Régénérer la photo ${shot.shotIndex + 1}`}><Sparkles className="h-4 w-4" /></button><button type="button" disabled={Boolean(actioning)} onClick={() => void continueShot(shot.creationId, true)} className="rounded-full bg-black/65 px-2 text-[10px] text-white disabled:opacity-50">Pose</button></div> : null}
        {shot.status === "FAILED" ? <button type="button" disabled={Boolean(actioning)} onClick={() => void continueShot(shot.creationId, false)} className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white disabled:opacity-50" aria-label={`Régénérer la photo ${shot.shotIndex + 1}`}><Sparkles className="h-4 w-4" /></button> : null}
      </article>)}
    </div>
  </section>
}
