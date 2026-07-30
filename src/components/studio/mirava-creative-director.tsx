"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useReducedMotion } from "framer-motion"
import { ArrowLeft, Check, Loader2, Send } from "lucide-react"
import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import { getMiravaCreativeDirectorChanges, getMiravaCreativeDirectorStarterActions } from "@/lib/mirava/creative-director"

type Locale = "fr" | "es"
type Message = { id: string; role: "director" | "user"; content: string; suggestions?: Partial<MiravaCreativeOptions> }

export function MiravaCreativeDirector({
  locale,
  universeId,
  options,
  onApply,
  onClose,
}: {
  locale: Locale
  universeId?: string | null
  options: MiravaCreativeOptions
  onApply: (suggestions: Partial<MiravaCreativeOptions>) => void
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "director",
    content: locale === "fr"
      ? "Dites-moi ce que vous voulez ressentir dans cette séance. Je vous aide à préciser le lieu, la lumière, le style et l’attitude."
      : "Dime qué quieres sentir en esta sesión. Te ayudo a precisar el lugar, la luz, el estilismo y la actitud.",
  }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const starterActions = getMiravaCreativeDirectorStarterActions(locale, universeId)
  const isFirstExchange = messages.length === 1 && !loading

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })
  }, [messages, loading, reduceMotion])

  const send = async (text?: string) => {
    const value = (text ?? input).trim()
    if (!value || loading) return
    setInput("")
    setError(null)
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: value }])
    setLoading(true)
    try {
      const response = await fetch("/api/visual-engine/creative-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ locale, message: value, universeId: universeId ?? null, creativeOptions: options }),
      })
      const data = await response.json().catch(() => ({})) as { reply?: string; suggestions?: Partial<MiravaCreativeOptions>; error?: string }
      if (!response.ok || !data.reply) throw new Error(data.error ?? "Unavailable")
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "director", content: data.reply!, suggestions: data.suggestions }])
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== "Unavailable"
        ? reason.message
        : (locale === "fr" ? "Alma est momentanément indisponible. Votre séance reste disponible." : "Alma no está disponible en este momento. Tu sesión sigue disponible."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mirava-theme fixed inset-0 z-50 min-h-dvh bg-mirava-canvas text-mirava-ink lg:grid lg:grid-cols-[1fr_minmax(24rem,38rem)_1fr]">
      <button onClick={onClose} className="mirava-button mirava-button-secondary absolute left-4 top-[var(--mirava-safe-top)] z-10 gap-2 bg-mirava-canvas/70 px-4 text-sm backdrop-blur-xl lg:left-8 lg:top-8">
        <ArrowLeft className="h-4 w-4" />
        {locale === "fr" ? "Retour au studio" : "Volver al estudio"}
      </button>
      <section aria-label={locale === "fr" ? "Conversation avec Alma" : "Conversación con Alma"} className="mirava-director-shell col-start-2 flex min-h-dvh flex-col bg-mirava-surface lg:my-4 lg:min-h-[calc(100dvh-2rem)]">
        <header className="px-5 pb-5 pt-[calc(var(--mirava-safe-top)+3.75rem)] sm:px-7 lg:pt-7">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/visual-engine/alma-directrice.webp" alt="Alma" width={64} height={64} priority className="mirava-alma-avatar h-14 w-14 shrink-0 object-cover" />
            <div className="min-w-0">
              <p className="mirava-label">MIRAVA / {locale === "fr" ? "DIRECTION CRÉATIVE" : "DIRECCIÓN CREATIVA"}</p>
              <h1 className="mirava-section-title mt-2 text-2xl">Alma</h1>
              <p className="mirava-muted mt-1 text-xs">{locale === "fr" ? "Directrice créative" : "Directora creativa"}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[82%]" : "max-w-[88%]"}>
              <div className={message.role === "user" ? "mirava-surface-raised px-4 py-3 text-sm leading-6" : "flex items-start gap-3"}>
                {message.role === "director" && <Image src="/visual-engine/alma-directrice.webp" alt="" width={36} height={36} className="mirava-alma-avatar h-9 w-9 shrink-0 object-cover" />}
                <div className={message.role === "director" ? "mirava-notice px-4 py-3 text-sm leading-6" : undefined}>{message.content}</div>
              </div>
              {message.suggestions && Object.keys(message.suggestions).length > 0 && (
                <div className="mirava-surface-raised mt-3 space-y-3 p-3">
                  <dl className="space-y-2">
                    {getMiravaCreativeDirectorChanges(locale, message.suggestions).map((change) => (
                      <div key={change.label} className="flex items-baseline justify-between gap-4 text-xs leading-5">
                        <dt className="mirava-muted shrink-0">{change.label}</dt>
                        <dd className="text-right text-mirava-ink">{change.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button onClick={() => onApply(message.suggestions!)} className="mirava-button mirava-button-secondary w-full gap-2 px-4 text-xs">
                    <Check className="h-3.5 w-3.5" />
                    {locale === "fr" ? "Appliquer à ma séance" : "Aplicar a mi sesión"}
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && <div aria-live="polite" className="mirava-muted flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-mirava-accent" />{locale === "fr" ? "Alma prépare une direction…" : "Alma está preparando una dirección…"}</div>}
          {error && <p role="alert" className="mirava-alert p-4 text-sm">{error}</p>}
          <div ref={endRef} />
        </div>

        <footer className="bg-mirava-canvas-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {isFirstExchange && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {starterActions.map((action) => (
                <button key={action.id} onClick={() => void send(action.message)} className="mirava-control min-h-12 px-3 text-left text-xs">
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <div className="mirava-input flex items-end gap-2 p-2 pl-4">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }} rows={1} maxLength={500} placeholder={locale === "fr" ? "Décrivez votre intention…" : "Describe tu intención…"} className="max-h-32 min-h-12 flex-1 resize-none bg-transparent py-3 text-base text-mirava-ink outline-none placeholder:text-mirava-muted" />
            <button onClick={() => void send()} disabled={!input.trim() || loading} className="mirava-button mirava-button-primary h-12 w-12 shrink-0" aria-label={locale === "fr" ? "Envoyer" : "Enviar"}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
