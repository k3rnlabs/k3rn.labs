"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, Loader2, ChevronLeft, Sparkles, BookmarkPlus, Check, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useSendPoleMessage, useStartPoleSession, type PoleData, type PoleSessionData } from "@/hooks/use-poles"
import { normalizeManagerName } from "@/lib/experts"

const POLE_COLORS: Record<string, string> = {
  P01_STRATEGIE: "from-violet-600 to-purple-800",
  P02_MARKET: "from-blue-600 to-cyan-700",
  P03_PRODUIT_TECH: "from-emerald-600 to-teal-700",
  P04_FINANCE: "from-amber-600 to-yellow-700",
  P05_MARKETING: "from-pink-600 to-rose-700",
  P06_LEGAL: "from-slate-600 to-gray-700",
  P07_TALENT_OPS: "from-orange-600 to-red-700",
}

interface PoleManagerChatProps {
  pole: PoleData
  dossierId: string
  currentLab?: string
  existingSession?: PoleSessionData | null
  onBack: () => void
}

interface Msg {
  id: string
  role: "user" | "manager"
  content: string
  timestamp: string
}

export function PoleManagerChat({ pole, dossierId, currentLab, existingSession, onBack }: PoleManagerChatProps) {
  const [session, setSession] = useState<PoleSessionData | null>(existingSession ?? null)
  const [messages, setMessages] = useState<Msg[]>(
    (existingSession?.messages as Msg[]) ?? []
  )
  const [input, setInput] = useState("")
  const [isStarting, setIsStarting] = useState(!existingSession)
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null)
  const [activeMission, setActiveMission] = useState<{ id: string; objective: string; status: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useAutoResize(input)
  const initialScrollDone = useRef(false)

  const { mutateAsync: startSession } = useStartPoleSession()
  const { mutateAsync: sendMessage, isPending: sending } = useSendPoleMessage()

  const color = POLE_COLORS[pole.code] ?? "from-gray-600 to-gray-800"

  useLayoutEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView()
      initialScrollDone.current = true
    }
  }, [messages])

  useEffect(() => {
    if (initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    fetch(`/api/kael/missions?dossierId=${dossierId}`)
      .then((r) => r.json())
      .then((missions: Array<{ id: string; poleCode: string; objective: string; status: string }>) => {
        const active = missions.find(
          (m) => m.poleCode === pole.code && (m.status === "RUNNING" || m.status === "PENDING")
        )
        setActiveMission(active ?? null)
      })
      .catch(() => {})
  }, [dossierId, pole.code])

  useEffect(() => {
    if (!existingSession && isStarting) {
      const displayManagerName = normalizeManagerName(pole.managerName)
      const greeting = getManagerGreeting(displayManagerName)
      setMessages([{
        id: crypto.randomUUID(),
        role: "manager",
        content: greeting,
        timestamp: new Date().toISOString(),
      }])
      setIsStarting(false)
    }
  }, [existingSession, isStarting, pole.managerName])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])

    try {
      if (!session) {
        const result = await startSession({ poleId: pole.id, dossierId, userMessage: text, currentLab })
        setSession(result.session)
        const msgs = result.session.messages as Msg[]
        setMessages(msgs)
      } else {
        const result = await sendMessage({ sessionId: session.id, userMessage: text })
        setSession(result.session)
        setMessages(result.session.messages as Msg[])
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "manager",
        content: "Une erreur est survenue. Réessayez.",
        timestamp: new Date().toISOString(),
      }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend()
  }

  async function handleSaveAsCard(msg: Msg) {
    if (savingMsgId || savedMsgIds.has(msg.id)) return
    setSavingMsgId(msg.id)
    try {
      const title = msg.content.split("\n")[0].slice(0, 120) || "Note"
      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId,
          title,
          content: { text: msg.content },
          cardType: "ANALYSIS",
          poleCode: pole.code,
          source: "EXPERT",
        }),
      })
      setSavedMsgIds((prev) => { const next = new Set(prev); next.add(msg.id); return next })
    } catch {
      // silent — user can retry
    } finally {
      setSavingMsgId(null)
    }
  }

  const handleVoiceResult = useCallback((t: string) => {
    setInput((prev) => prev ? prev + " " + t : t)
  }, [])

  const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-3 px-4 py-3 bg-gradient-to-r text-white shrink-0", color)}>
        <button onClick={onBack} className="hover:opacity-70 transition-opacity">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black bg-white/20")}>
          {normalizeManagerName(pole.managerName).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{normalizeManagerName(pole.managerName).toUpperCase()}</p>
          <p className="text-xs opacity-75">{pole.code.replace(/_/g, " ")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {activeMission && (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
            <Radio className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-blue-400">Mission en cours</span>
              <span className="text-blue-200/80 leading-snug">{activeMission.objective}</span>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex group", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "manager" && (
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white mr-2 shrink-0 mt-0.5 bg-gradient-to-br", color)}>
                {normalizeManagerName(pole.managerName).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="max-w-[80%] flex flex-col gap-1">
              <div className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={cn("text-[10px] mt-1 opacity-40", msg.role === "user" ? "text-right" : "")}>
                  {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "manager" && session && (
                <button
                  onClick={() => handleSaveAsCard(msg)}
                  disabled={savingMsgId === msg.id || savedMsgIds.has(msg.id)}
                  className={cn(
                    "self-start flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all",
                    savedMsgIds.has(msg.id)
                      ? "text-emerald-500 opacity-100"
                      : "text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-muted-foreground hover:bg-muted"
                  )}
                >
                  {savedMsgIds.has(msg.id) ? (
                    <><Check className="h-3 w-3" /> Carte créée</>
                  ) : savingMsgId === msg.id ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</>
                  ) : (
                    <><BookmarkPlus className="h-3 w-3" /> Créer une carte</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white mr-2 shrink-0 bg-gradient-to-br", color)}>
              {normalizeManagerName(pole.managerName).slice(0, 1).toUpperCase()}
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-border/50">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message à ${normalizeManagerName(pole.managerName).toUpperCase()}… (⌘↵ pour envoyer)`}
              className="min-h-[44px] resize-none text-sm rounded-xl py-3 bg-muted/40 border-muted focus:border-primary/50 overflow-hidden"
              rows={1}
              disabled={sending}
            />
            {interim && (
              <p className="px-3 pt-1 text-xs text-muted-foreground/60 italic truncate">{interim}</p>
            )}
          </div>
          <button
            onClick={toggleVoice}
            className={cn("p-2.5 rounded-xl transition-colors", isListening ? "bg-red-500/10 text-red-500" : "hover:bg-muted text-muted-foreground")}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <Button size="sm" onClick={handleSend} disabled={sending || !input.trim()} className="rounded-xl px-3">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
          <Sparkles className="h-2.5 w-2.5 inline mr-1" />
          {`Propulsé par ${pole.managerName} · K3RN OS`}
        </p>
      </div>
    </div>
  )
}

function getManagerGreeting(name: string): string {
  const checkName = normalizeManagerName(name).toUpperCase()

  const greetings: Record<string, string> = {
    AXEL: "Bonjour. Je suis AXEL, ton Directeur Stratégie & Innovation.\n\nJe challenge les idées sans ménagement et je valide ce qui est solide. Sur quel défi stratégique travaillons-nous ?",
    MAYA: "Bonjour. Je suis MAYA, ta Directrice Market & Intelligence.\n\nJe produis de l'intelligence marché qui permet de décider, pas juste d'informer. Quel marché ou secteur veux-tu analyser ?",
    KAI: "Bonjour. Je suis KAI, ton Architecte Produit & Tech.\n\nJe transforme les idées en plans d'implémentation actionnables. Décris-moi ce que tu veux construire.",
    ELENA: "Bonjour. Je suis ELENA, ta Directrice Financière.\n\nJe travaille toujours avec des hypothèses explicites et des scénarios clairs. Quel projet ou modèle économique modélisons-nous ?",
    SKY: "Bonjour. Je suis SKY, ta Chief Marketing Officer.\n\nJe construis des marques qui convertissent. Quel est le projet de marque ou la stratégie marketing sur laquelle on travaille ?",
    MARCUS: "Bonjour. Je suis MARCUS, ton Conseiller Juridique.\n\nJ'identifie les risques et propose des solutions concrètes — sans bloquer l'action. Quel risque légal veux-tu traiter ?",
    NOVA: "Bonjour. Je suis NOVA, ta Directrice des Opérations.\n\nJe m'assure que les bonnes personnes font les bonnes choses au bon moment. Quels sont tes besoins en ressources ou coordination ?",
  }
  return greetings[checkName] ?? `Bonjour, je suis ${checkName}. Comment puis-je vous aider ?`
}
