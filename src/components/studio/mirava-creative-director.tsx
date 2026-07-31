"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useReducedMotion } from "framer-motion"
import { ArrowLeft, Briefcase, Camera, Check, CheckCircle2, Compass, Loader2, Send, Sliders, Sparkles } from "lucide-react"
import type { MiravaCreativeOptions } from "@/lib/mirava/creative-options"
import { getMiravaCreativeDirectorChanges, getMiravaCreativeDirectorStarterActions } from "@/lib/mirava/creative-director"

type Locale = "fr" | "es"
type Message = { id: string; role: "director" | "user"; content: string; suggestions?: Partial<MiravaCreativeOptions> }

const iconMap = {
  briefcase: Briefcase,
  sparkles: Sparkles,
  camera: Camera,
  compass: Compass,
}

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "director",
      content: locale === "fr"
        ? "Bonjour, je suis Alma, votre Directrice Créative. Je suis là pour traduire votre vision en une séance photo éditoriale Haute Couture ou Personal Branding. De quelle ambiance souhaitez-vous vous inspirer aujourd'hui ?"
        : "Hola, soy Alma, tu Directora Creativa. Estoy aquí para traducir tu visión en una sesión fotográfica editorial de Alta Costura o Personal Branding. ¿En qué ambiente te gustaría inspirarte hoy?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
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

  const handleApplySuggestions = (msgId: string, suggestions: Partial<MiravaCreativeOptions>) => {
    onApply(suggestions)
    setAppliedIds((current) => new Set(current).add(msgId))
  }

  return (
    <div className="mirava-theme fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-mirava-canvas text-mirava-ink lg:grid lg:grid-cols-[1fr_minmax(24rem,38rem)_1fr]">
      <button onClick={onClose} className="mirava-button mirava-button-secondary absolute left-4 top-[calc(var(--mirava-safe-top)+0.75rem)] z-20 gap-2 bg-mirava-canvas/80 px-4 text-sm backdrop-blur-xl lg:left-8 lg:top-8">
        <ArrowLeft className="h-4 w-4" />
        {locale === "fr" ? "Retour au studio" : "Volver al estudio"}
      </button>
      <section aria-label={locale === "fr" ? "Conversation avec Alma" : "Conversación con Alma"} className="mirava-director-shell col-start-2 flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-mirava-surface lg:my-4 lg:max-h-[calc(100dvh-2rem)] lg:rounded-3xl lg:border lg:border-mirava-line/50">
        <header className="shrink-0 border-b border-mirava-line/40 px-5 pb-4 pt-[calc(var(--mirava-safe-top)+3.5rem)] sm:px-7 lg:pt-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative shrink-0">
              <Image src="/visual-engine/alma-directrice.webp" alt="Alma" width={64} height={64} priority className="mirava-alma-avatar h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-mirava-accent/40 shadow-lg shadow-mirava-accent/15" />
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-mirava-accent ring-2 ring-mirava-surface" />
            </div>
            <div className="min-w-0">
              <p className="mirava-label">MIRAVA / {locale === "fr" ? "DIRECTION CRÉATIVE" : "DIRECCIÓN CREATIVA"}</p>
              <h1 className="mirava-section-title mt-1.5 text-2xl">Alma</h1>
              <p className="mirava-muted mt-0.5 text-xs flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-mirava-accent" />
                {locale === "fr" ? "Directrice créative IA · En ligne" : "Directora creativa IA · En línea"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          {/* Explanatory onboarding box */}
          <div className="mirava-notice rounded-2xl border border-mirava-accent/20 bg-gradient-to-br from-mirava-surface-raised/90 to-mirava-canvas-raised/80 space-y-3 p-4 sm:p-5 shadow-lg">
            <div className="flex items-center gap-2 font-jakarta text-sm font-semibold text-mirava-accent">
              <Sparkles className="h-4 w-4 shrink-0 text-mirava-accent" />
              {locale === "fr" ? "En quoi Alma vous aide dans votre séance ?" : "¿En qué te ayuda Alma en tu sesión?"}
            </div>
            <p className="text-xs leading-5 text-mirava-ink-secondary">
              {locale === "fr"
                ? "Alma conçoit votre direction artistique sur-mesure. Échangez avec elle pour préciser le décor, l’attitude ou la lumière, puis appliquez directement ses recommandations à votre séance en 1 clic."
                : "Alma diseña tu dirección artística a medida. Habla con ella para precisar el escenario, actitud o luz, y aplica sus recomendaciones directamente a tu sesión en 1 clic."}
            </p>
            <div className="grid gap-2 pt-1 text-[11px] font-medium text-mirava-ink-secondary sm:grid-cols-3">
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mirava-accent" />{locale === "fr" ? "Ambiance & Décor" : "Ambiente y Escenario"}</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mirava-accent" />{locale === "fr" ? "Cadrage & Série" : "Encuadre y Serie"}</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-mirava-accent" />{locale === "fr" ? "Application 1-clic" : "Aplicación en 1 clic"}</div>
            </div>
          </div>

          {messages.map((message) => {
            const isApplied = appliedIds.has(message.id)
            if (message.role === "user") {
              return (
                <div key={message.id} className="ml-auto max-w-[85%] sm:max-w-[75%]">
                  <div className="rounded-2xl rounded-tr-sm border border-mirava-accent/35 bg-gradient-to-r from-mirava-accent/15 via-mirava-accent/20 to-mirava-accent/10 px-4 py-3.5 text-sm leading-6 text-mirava-ink shadow-lg shadow-mirava-accent/5 backdrop-blur-md">
                    <div className="mb-1 text-right text-[9px] font-semibold uppercase tracking-wider text-mirava-accent/80">
                      {locale === "fr" ? "Vous" : "Tú"}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              )
            }

            return (
              <div key={message.id} className="flex items-start gap-3 max-w-[94%] sm:max-w-[88%]">
                <Image src="/visual-engine/alma-directrice.webp" alt="Alma" width={40} height={40} className="mirava-alma-avatar mt-1 h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-mirava-accent/40 shadow-md shadow-mirava-accent/15" />
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-sm border border-mirava-accent/25 bg-gradient-to-b from-mirava-surface-raised/95 to-mirava-surface-raised/85 p-4 text-sm leading-6 shadow-xl shadow-black/20 backdrop-blur-md">
                    <div className="mb-2 flex items-center justify-between border-b border-mirava-line/25 pb-1.5">
                      <span className="text-[10px] font-semibold tracking-wider text-mirava-accent uppercase">
                        Alma · Directrice Créative
                      </span>
                      <span className="text-[9px] font-medium text-mirava-muted uppercase tracking-widest">
                        MIRAVA IA
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-mirava-ink">{message.content}</p>
                  </div>

                  {message.suggestions && Object.keys(message.suggestions).length > 0 && (
                    <div className="rounded-2xl border border-mirava-accent/35 bg-gradient-to-br from-mirava-canvas-raised/90 to-mirava-surface-raised/95 p-4 sm:p-5 shadow-2xl shadow-mirava-accent/10 backdrop-blur-xl">
                      <div className="mb-3.5 flex items-center justify-between border-b border-mirava-line/30 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-mirava-accent uppercase">
                          <Sliders className="h-4 w-4 shrink-0 text-mirava-accent" />
                          {locale === "fr" ? "Direction artistique proposée" : "Dirección artística sugerida"}
                        </div>
                        <span className="rounded-full bg-mirava-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-mirava-accent border border-mirava-accent/20">
                          {locale === "fr" ? "Prêt à appliquer" : "Listo para aplicar"}
                        </span>
                      </div>
                      <div className="mb-4 grid gap-2 sm:grid-cols-2">
                        {getMiravaCreativeDirectorChanges(locale, message.suggestions).map((change) => (
                          <div key={change.label} className="flex flex-col justify-between rounded-xl border border-mirava-line/50 bg-mirava-surface/80 p-3 text-xs leading-5 shadow-sm">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-mirava-muted">{change.label}</span>
                            <span className="mt-1 font-semibold text-mirava-ink">{change.value}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleApplySuggestions(message.id, message.suggestions!)}
                        className={
                          isApplied
                            ? "mirava-button mirava-button-secondary w-full gap-2 px-4 text-xs font-semibold text-mirava-success bg-mirava-success/10 border-mirava-success/30"
                            : "mirava-button mirava-button-primary w-full gap-2 px-4 text-xs font-semibold shadow-lg shadow-mirava-accent/20 hover:scale-[1.01] transition-transform"
                        }
                      >
                        {isApplied ? <CheckCircle2 className="h-4 w-4 text-mirava-success" /> : <Sparkles className="h-4 w-4" />}
                        {isApplied
                          ? (locale === "fr" ? "Direction appliquée à votre séance ✓" : "Dirección aplicada a tu sesión ✓")
                          : (locale === "fr" ? "Appliquer cette direction à ma séance" : "Aplicar esta dirección a mi sesión")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {loading && (
            <div className="flex items-center gap-3">
              <Image src="/visual-engine/alma-directrice.webp" alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover ring-2 ring-mirava-accent/30" />
              <div aria-live="polite" className="mirava-notice rounded-2xl rounded-tl-sm border border-mirava-accent/20 px-4 py-3 text-xs leading-5 text-mirava-ink flex items-center gap-2 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-mirava-accent" />
                {locale === "fr" ? "Alma prépare votre direction créative…" : "Alma está preparando tu dirección creativa…"}
              </div>
            </div>
          )}
          {error && <p role="alert" className="mirava-alert p-4 text-sm">{error}</p>}
          <div ref={endRef} />
        </div>

        <footer className="shrink-0 border-t border-mirava-line/40 bg-mirava-canvas-raised p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 shadow-2xl">
          {isFirstExchange && (
            <div className="mb-4 space-y-2">
              <p className="px-1 text-[11px] font-semibold tracking-wider text-mirava-muted uppercase">
                {locale === "fr" ? "Idées d’intentions créatives pour votre séance :" : "Ideas de intenciones creativas para tu sesión:"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {starterActions.map((action) => {
                  const IconComponent = iconMap[action.icon] ?? Sparkles
                  return (
                    <button
                      key={action.id}
                      onClick={() => void send(action.message)}
                      className="mirava-control group flex min-h-16 items-start gap-3 p-3.5 text-left transition-all hover:border-mirava-accent/50 hover:bg-mirava-surface-raised"
                    >
                      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mirava-surface-raised text-mirava-accent group-hover:bg-mirava-accent group-hover:text-mirava-canvas transition-colors">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-mirava-ink">{action.title}</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-mirava-muted">{action.subtitle}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="mirava-input flex items-end gap-2 p-2 pl-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
              rows={1}
              maxLength={500}
              placeholder={locale === "fr" ? "Ex: Je veux un shooting chic solaire à la lumière dorée…" : "Ej: Quiero una sesión chic solar con luz dorada…"}
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent py-3 text-sm text-mirava-ink outline-none placeholder:text-mirava-muted"
            />
            <button onClick={() => void send()} disabled={!input.trim() || loading} className="mirava-button mirava-button-primary h-12 w-12 shrink-0" aria-label={locale === "fr" ? "Envoyer" : "Enviar"}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
