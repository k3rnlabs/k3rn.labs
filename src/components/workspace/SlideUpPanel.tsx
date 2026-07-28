"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useNotificationSound } from "@/hooks/use-notification-sound"
import {
    useSendPoleMessage,
    useStartPoleSession,
    useActivePoleSession,
    useKaelRoute,
    type PoleData,
    type PoleSessionData,
} from "@/hooks/use-poles"
import { Send, Mic, MicOff, Loader2, Sparkles, BookmarkPlus, Check, X, ChevronDown, Zap, ChevronRight, AlertTriangle, Radio } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace.store"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"
import { subscribeToChannel } from "@/lib/realtime"

// ─── Pole config ─────────────────────────────────────────────────────────────

const POLE_GRADIENTS: Record<string, string> = {
    P01_STRATEGIE: "from-violet-600 to-purple-800",
    P02_MARKET: "from-blue-600 to-cyan-700",
    P03_PRODUIT_TECH: "from-emerald-600 to-teal-700",
    P04_FINANCE: "from-amber-500 to-yellow-600",
    P05_MARKETING: "from-pink-600 to-rose-700",
    P06_LEGAL: "from-slate-600 to-gray-700",
    P07_TALENT_OPS: "from-orange-600 to-red-700",
}

// ─── Mission types ────────────────────────────────────────────────────────────

interface MissionProposalData {
    poleCode: string
    managerName: string
    objective: string
    estimatedCost: number
    costBreakdown: string
    clarifyingQuestions?: string[]
}

interface MissionPlanData {
    missionId: string
    estimatedCost: number
}

interface MissionResultData {
    summary: string
    fullReport?: string
    confidence?: number
    suggestedCascade?: { poleCode: string; managerName: string; objective: string }
    proposedCard?: unknown
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface Msg {
    id: string
    role: "user" | "manager" | "kael"
    content: string
    timestamp: string
    choices?: string[]
    missionProposal?: MissionProposalData
    isMissionUpdate?: boolean
    isMissionStatus?: boolean
    isMissionPlan?: boolean
    isMissionResult?: boolean
    missionId?: string
    estimatedCost?: number
    missionResult?: MissionResultData
    routedPole?: string
    routedManager?: string
    routingReason?: string
}

// ─── Mission Proposal Card ────────────────────────────────────────────────────

function MissionProposalCard({
    proposal,
    dossierId,
    kaelSessionId,
    disabled,
    onMissionLaunched,
    onMissionBriefed,
    onSessionInteractive,
}: {
    proposal: MissionProposalData
    dossierId: string
    kaelSessionId: string
    disabled?: boolean
    onMissionLaunched: (missionId: string) => void
    onMissionBriefed?: (poleCode: string, managerName: string, poleSessionId: string, poleId: string, missionId: string) => void
    onSessionInteractive?: (poleCode: string, managerName: string, objective: string) => void
}) {
    const [phase, setPhase] = useState<"idle" | "estimating" | "confirming" | "launching">("idle")
    const [brief, setBrief] = useState<string | null>(null)
    const [confirmedCost, setConfirmedCost] = useState(proposal.estimatedCost)
    const [error, setError] = useState<string | null>(null)

    const displayName = normalizeManagerName(proposal.managerName)
    const imgSrc = getExpertImage(proposal.managerName)

    async function handleGenerateBrief() {
        setError(null)
        setPhase("estimating")
        try {
            const estRes = await fetch("/api/kael/missions/estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dossierId,
                    kaelSessionId,
                    poleCode: proposal.poleCode,
                    managerName: proposal.managerName,
                    initialObjective: proposal.objective,
                }),
            })
            const estData = await estRes.json()
            if (!estRes.ok) {
                setError("Impossible de générer le brief. Réessaie.")
                setPhase("idle")
                return
            }
            setBrief(estData.data?.briefFinal ?? estData.briefFinal ?? proposal.objective)
            setConfirmedCost(estData.data?.estimatedCost ?? estData.estimatedCost ?? proposal.estimatedCost)
            setPhase("confirming")
        } catch {
            setError("Erreur réseau. Réessaie.")
            setPhase("idle")
        }
    }

    async function handleConfirmLaunch() {
        if (!brief) return
        setPhase("launching")
        try {
            const res = await fetch("/api/kael/missions/brief", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dossierId,
                    kaelSessionId,
                    poleCode: proposal.poleCode,
                    managerName: proposal.managerName,
                    objective: proposal.objective,
                    estimatedCost: confirmedCost,
                    briefFinal: brief,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? "Erreur lors du lancement.")
                setPhase("confirming")
                return
            }
            const { poleSessionId, poleId, missionId } = data.data ?? data
            // Notify parent: KAEL closes, pole panel opens
            if (onMissionBriefed && poleSessionId && poleId) {
                onMissionBriefed(proposal.poleCode, proposal.managerName, poleSessionId, poleId, missionId ?? "")
            } else {
                onMissionLaunched(missionId ?? "")
            }
        } catch {
            setError("Erreur réseau. Réessaie.")
            setPhase("confirming")
        }
    }

    return (
        <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            {/* Expert header */}
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5 border-b border-white/[0.05]">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-primary/10 border border-primary/20">
                    <img src={imgSrc} alt={displayName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold tracking-wide text-white/90">{displayName.toUpperCase()}</p>
                    <p className="text-[10px] text-white/35">{proposal.poleCode.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-400/80">
                    <Zap className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">{confirmedCost} mission{confirmedCost > 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* Objective */}
            <div className="px-3 py-2.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Objectif</p>
                <p className="text-[12px] text-white/80 leading-relaxed">{proposal.objective}</p>
            </div>

            {/* Brief preview (confirming phase) */}
            {phase === "confirming" && brief && (
                <div className="px-3 pb-2.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Brief généré</p>
                    <p className="text-[11px] text-white/60 leading-relaxed max-h-[80px] overflow-y-auto">{brief}</p>
                    <p className="text-[10px] text-amber-400/70 mt-1.5">
                        Coût confirmé : {confirmedCost} mission{confirmedCost > 1 ? "s" : ""} débitées à la confirmation
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mx-3 mb-2 flex items-center gap-1.5 text-red-400/80 text-[11px]">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Actions */}
            <div className="px-3 pb-3 flex items-center gap-2">
                {phase === "idle" && (
                    <>
                        <Button
                            size="sm"
                            onClick={handleGenerateBrief}
                            disabled={disabled}
                            className="h-7 text-[11px] px-3 bg-primary/90 hover:bg-primary border-0 rounded-lg"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Générer le brief
                        </Button>
                        <button
                            onClick={() => {
                                setPhase("confirming") // disable card after click
                                onSessionInteractive?.(proposal.poleCode, proposal.managerName, proposal.objective)
                            }}
                            disabled={disabled || !onSessionInteractive}
                            className="h-7 text-[11px] px-3 rounded-lg border border-white/[0.1] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
                        >
                            Session interactive
                        </button>
                    </>
                )}
                {phase === "estimating" && (
                    <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Génération du brief…
                    </div>
                )}
                {phase === "confirming" && (
                    <>
                        <Button
                            size="sm"
                            onClick={handleConfirmLaunch}
                            className="h-7 text-[11px] px-3 bg-emerald-600/90 hover:bg-emerald-600 border-0 rounded-lg"
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Confirmer le lancement
                        </Button>
                        <button
                            onClick={() => setPhase("idle")}
                            className="h-7 text-[11px] px-3 rounded-lg text-white/40 hover:text-white/70 transition-colors"
                        >
                            Annuler
                        </button>
                    </>
                )}
                {phase === "launching" && (
                    <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Préparation du plan…
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Mission Update Bubble ────────────────────────────────────────────────────

function MissionUpdateBubble({ content }: { content: string }) {
    return (
        <div className="flex items-start gap-2 pl-1">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 animate-pulse" />
            <p className="text-[11px] text-white/40 italic leading-relaxed">{content}</p>
        </div>
    )
}

// ─── Mission Result Bubble ────────────────────────────────────────────────────

function MissionResultBubble({
    result,
    dossierId,
    managerName,
}: {
    result: MissionResultData
    dossierId: string
    managerName?: string
}) {
    const [expanded, setExpanded] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [cascadeDecided, setCascadeDecided] = useState(false)

    async function handleSaveCard() {
        if (saving || saved) return
        setSaving(true)
        try {
            await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dossierId,
                    title: result.summary.split("\n")[0].slice(0, 120) || "Mission Report",
                    content: { text: result.fullReport ?? result.summary },
                    cardType: "ANALYSIS",
                    source: "EXPERT",
                }),
            })
            setSaved(true)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] overflow-hidden">
            {/* Summary */}
            <div className="px-3 pt-3 pb-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Mission accomplie</span>
                    {result.confidence !== undefined && (
                        <span className="text-[10px] text-white/30 ml-auto">{Math.round(result.confidence * 100)}% confiance</span>
                    )}
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">{result.summary}</p>
            </div>

            {/* Full report toggle */}
            {result.fullReport && (
                <>
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 border-t border-white/[0.05] text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
                    >
                        <span>Rapport complet</span>
                        <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
                    </button>
                    {expanded && (
                        <div className="px-3 pb-3 text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto border-t border-white/[0.05] pt-2.5">
                            {result.fullReport}
                        </div>
                    )}
                </>
            )}

            {/* Cascade suggestion */}
            {result.suggestedCascade && !cascadeDecided && (
                <div className="border-t border-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] text-white/50 mb-1.5">
                        Suggestion : envoyer <strong className="text-white/70">{normalizeManagerName(result.suggestedCascade.managerName).toUpperCase()}</strong> sur{" "}
                        <em className="text-white/60">{result.suggestedCascade.objective}</em>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCascadeDecided(true)}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/20 text-primary/90 hover:bg-primary/30 transition-colors"
                        >
                            Lancer
                        </button>
                        <button
                            onClick={() => setCascadeDecided(true)}
                            className="text-[10px] px-2.5 py-1 rounded-lg text-white/30 hover:text-white/50 transition-colors"
                        >
                            Ignorer
                        </button>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="border-t border-white/[0.05] px-3 py-2 flex items-center gap-2">
                <button
                    onClick={handleSaveCard}
                    disabled={saving || saved}
                    className={cn(
                        "flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg transition-all",
                        saved
                            ? "text-emerald-400"
                            : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
                    )}
                >
                    {saved ? <><Check className="h-2.5 w-2.5" /> Carte créée</> : saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><BookmarkPlus className="h-2.5 w-2.5" /> Valider en carte</>}
                </button>
            </div>
        </div>
    )
}

// ─── Mission Confirm Card (in PoleSlideUpPanel — for isMissionPlan messages) ──

function MissionConfirmCard({
    missionId,
    poleSessionId,
    estimatedCost,
    dossierId,
    onConfirmed,
    onCancelled,
}: {
    missionId: string
    poleSessionId: string
    estimatedCost: number
    dossierId: string
    onConfirmed: () => void
    onCancelled: () => void
}) {
    const [phase, setPhase] = useState<"idle" | "confirming" | "done">("idle")
    const [error, setError] = useState<string | null>(null)

    async function handleConfirm() {
        setPhase("confirming")
        setError(null)
        try {
            const res = await fetch("/api/kael/missions/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ missionId, poleSessionId }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? "Erreur lors de la confirmation.")
                setPhase("idle")
                return
            }
            setPhase("done")
            onConfirmed()
        } catch {
            setError("Erreur réseau. Réessaie.")
            setPhase("idle")
        }
    }

    if (phase === "done") {
        return (
            <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Mission lancée — rapport en cours de préparation…
            </div>
        )
    }

    return (
        <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-amber-500/10">
                <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">Confirmation requise</p>
                <p className="text-[11px] text-white/70 leading-snug">
                    Confirmer consomme <strong className="text-amber-400">{estimatedCost} mission{estimatedCost > 1 ? "s" : ""}</strong> de votre budget.
                </p>
            </div>
            {error && (
                <div className="px-3 py-1.5 flex items-center gap-1.5 text-red-400/80 text-[11px]">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            <div className="px-3 py-2.5 flex items-center gap-2">
                {phase === "confirming" ? (
                    <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Lancement en cours…
                    </div>
                ) : (
                    <>
                        <Button
                            size="sm"
                            onClick={handleConfirm}
                            className="h-7 text-[11px] px-3 bg-emerald-600/90 hover:bg-emerald-600 border-0 rounded-lg"
                        >
                            <Zap className="h-3 w-3 mr-1" />
                            Confirmer la mission — {estimatedCost} mission{estimatedCost > 1 ? "s" : ""}
                        </Button>
                        <button
                            onClick={onCancelled}
                            className="h-7 text-[11px] px-3 rounded-lg text-white/40 hover:text-white/70 transition-colors"
                        >
                            Annuler
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── Shared chat input ────────────────────────────────────────────────────────

interface ChatInputProps {
    input: string
    setInput: (v: string | ((p: string) => string)) => void
    onSend: () => void
    sending: boolean
    placeholder: string
}

function ChatInput({ input, setInput, onSend, sending, placeholder }: ChatInputProps) {
    const textareaRef = useAutoResize(input)
    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [setInput])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    return (
        <div className="shrink-0 px-4 py-3 border-t border-white/[0.05]">
            {interim && (
                <p className="text-[10px] text-white/30 italic mb-1.5 px-1">{interim}</p>
            )}
            <div className="flex items-end gap-2">
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend() }}
                    placeholder={placeholder}
                    className="min-h-[36px] max-h-[120px] text-sm resize-none rounded-xl py-2 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-primary/40 focus:bg-white/[0.06] transition-colors overflow-y-auto"
                    rows={1}
                    disabled={sending}
                />
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={toggleVoice}
                        className={cn(
                            "p-2 rounded-xl transition-colors",
                            isListening ? "bg-red-500/15 text-red-400" : "bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/60"
                        )}
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <Button
                        size="sm"
                        onClick={onSend}
                        disabled={sending || !input.trim()}
                        className="rounded-xl px-3 h-9 bg-primary/90 hover:bg-primary border-0 shadow-[0_4px_12px_rgba(var(--primary),0.3)]"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <p className="text-[9px] text-white/15 text-right mt-1">⌘↵ pour envoyer</p>
        </div>
    )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
    msg,
    avatar,
    onSave,
    saving,
    saved,
    onChoiceSelect,
    choicesDisabled,
}: {
    msg: Msg
    avatar?: React.ReactNode
    onSave?: () => void
    saving?: boolean
    saved?: boolean
    onChoiceSelect?: (c: string) => void
    choicesDisabled?: boolean
}) {
    const isUser = msg.role === "user"
    return (
        <div className={cn("flex group gap-2", isUser ? "justify-end" : "justify-start")}>
            {!isUser && avatar && <div className="shrink-0 mt-0.5">{avatar}</div>}
            <div className="max-w-[78%] flex flex-col gap-1">
                <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-white/[0.06] text-white/90 rounded-bl-sm border border-white/[0.05]"
                )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn("text-[9px] mt-1 opacity-35", isUser ? "text-right" : "")}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                </div>
                {!isUser && msg.choices && msg.choices.length > 0 && onChoiceSelect && (
                    <ChoiceChips choices={msg.choices} onSelect={onChoiceSelect} disabled={choicesDisabled} />
                )}
                {!isUser && onSave && (
                    <button
                        onClick={onSave}
                        disabled={saving || saved}
                        className={cn(
                            "self-start flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all",
                            saved ? "text-emerald-400" : "text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/50 hover:bg-white/[0.05]"
                        )}
                    >
                        {saved ? <><Check className="h-2.5 w-2.5" /> Carte créée</> : saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><BookmarkPlus className="h-2.5 w-2.5" /> Carte</>}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Choice chips ─────────────────────────────────────────────────────────────

function ChoiceChips({ choices, onSelect, disabled }: { choices: string[]; onSelect: (c: string) => void; disabled?: boolean }) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {choices.map((c) => (
                <button
                    key={c}
                    onClick={() => onSelect(c)}
                    disabled={disabled}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/90 hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {c}
                </button>
            ))}
        </div>
    )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ avatar }: { avatar: React.ReactNode }) {
    return (
        <div className="flex gap-2">
            <div className="shrink-0">{avatar}</div>
            <div className="bg-white/[0.06] border border-white/[0.05] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Panel shell ──────────────────────────────────────────────────────────────

interface PanelShellProps {
    header: React.ReactNode
    children: React.ReactNode
    onClose: () => void
    className?: string
}

function PanelShell({ header, children, onClose, className }: PanelShellProps) {
    return (
        <>
            <div className="fixed inset-0 bottom-[80px] z-[65] bg-black/20" onClick={onClose} />
            <div
                className={cn(
                    "fixed bottom-[116px] z-[66] w-[400px]",
                    "flex flex-col rounded-2xl overflow-hidden",
                    "border border-white/[0.08] bg-[#0d0d0d]",
                    
                    "animate-in slide-in-from-bottom-4 duration-250",
                    className
                )}
                style={{ height: 540 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none rounded-2xl" />
                {header}
                {children}
            </div>
        </>
    )
}

// ─── KAEL Slide-Up Panel ──────────────────────────────────────────────────────

interface KaelSlideUpProps {
    dossierId: string
    currentLab?: string
    onClose: () => void
    onRouteToPole?: (poleCode: string, managerName: string, routingReason?: string) => void
    onSessionInteractiveToPole?: (poleCode: string, managerName: string, objective: string) => void
    onMissionBriefed?: (poleCode: string, managerName: string, poleSessionId: string, poleId: string, missionId: string) => void
}

export function KaelSlideUpPanel({ dossierId, currentLab, onClose, onRouteToPole, onSessionInteractiveToPole, onMissionBriefed }: KaelSlideUpProps) {
    const { clearUnread } = useWorkspaceStore()
    const [messages, setMessages] = useState<Msg[]>([])
    const [sessionId, setSessionId] = useState<string | undefined>()
    const [input, setInput] = useState("")
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const prevMsgCountRef = useRef(0)
    const { mutateAsync: kaelRoute, isPending: sending } = useKaelRoute()
    const { play: playSound } = useNotificationSound()
    const initDone = useRef(false)

    // Load active session on mount — opener generated by LLM on first send
    useEffect(() => {
        if (initDone.current) return
        initDone.current = true
        fetch(`/api/kael/session/active?dossierId=${dossierId}`)
            .then((r) => r.json())
            .then((data) => {
                const s = data.session
                if (s?.messages?.length) {
                    setSessionId(s.id)
                    setMessages(
                        (s.messages as Array<{
                            id: string; role: string; content: string; timestamp: string
                            choices?: string[]; missionProposal?: MissionProposalData
                            isMissionUpdate?: boolean; isMissionStatus?: boolean; missionId?: string
                            missionResult?: MissionResultData
                            routedPole?: string; routedManager?: string; routingReason?: string
                        }>)
                            .filter((m) => m.role !== "kael_note")
                            .map((m) => ({
                                id: m.id,
                                role: (m.role === "user" ? "user" : "kael") as Msg["role"],
                                content: m.content,
                                timestamp: m.timestamp,
                                choices: m.choices,
                                missionProposal: m.missionProposal ? {
                                    ...m.missionProposal,
                                    objective: (m.missionProposal as any).initialObjective ?? m.missionProposal.objective ?? "",
                                } : undefined,
                                isMissionUpdate: m.isMissionUpdate,
                                isMissionStatus: m.isMissionStatus,
                                missionId: m.missionId,
                                missionResult: m.missionResult,
                                routedPole: m.routedPole,
                                routedManager: m.routedManager,
                                routingReason: m.routingReason,
                            }))
                    )
                }
            })
            .catch(() => {})
    }, [dossierId])

    // Clear unread badge when panel opens
    useEffect(() => {
        clearUnread("kael")
    }, [clearUnread])

    // Instant scroll on initial load, smooth only for new incoming messages
    useLayoutEffect(() => {
        if (messages.length > 0 && prevMsgCountRef.current === 0) {
            bottomRef.current?.scrollIntoView()
        }
    }, [messages])
    useEffect(() => {
        const isFirst = prevMsgCountRef.current === 0
        prevMsgCountRef.current = messages.length
        if (isFirst || messages.length === 0) return
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Supabase Realtime — mission updates
    useEffect(() => {
        const unsub = subscribeToChannel(dossierId, "mission", (payload: unknown) => {
            const p = (payload as { payload?: unknown })?.payload ?? payload
            const data = p as {
                type: string; missionId?: string; message?: string; status?: string
                result?: MissionResultData; managerName?: string
            }

            if (data.type === "mission_update" && data.message) {
                setMessages((prev) => [...prev, {
                    id: crypto.randomUUID(),
                    role: "kael",
                    content: data.message ?? "",
                    timestamp: new Date().toISOString(),
                    isMissionUpdate: true,
                    missionId: data.missionId,
                }])
                bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }

            if (data.type === "mission_complete" && data.result) {
                setActiveMissionId(null)
                setMessages((prev) => [...prev, {
                    id: crypto.randomUUID(),
                    role: "kael",
                    content: data.result?.summary ?? "Mission terminée.",
                    timestamp: new Date().toISOString(),
                    missionId: data.missionId,
                    missionResult: data.result,
                }])
                playSound()
                bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }

            if (data.type === "mission_failed") {
                setActiveMissionId(null)
                setMessages((prev) => [...prev, {
                    id: crypto.randomUUID(),
                    role: "kael",
                    content: "La mission a échoué. Budget remboursé.",
                    timestamp: new Date().toISOString(),
                    isMissionStatus: true,
                    missionId: data.missionId,
                }])
            }
        })
        return unsub
    }, [dossierId, playSound])

    async function handleSend(overrideText?: string) {
        const text = (overrideText ?? input).trim()
        if (!text || sending) return
        setInput("")
        // Strip choices from all previous KAEL messages (only last one shows choices)
        setMessages((prev) => prev.map((m) => m.role === "kael" ? { ...m, choices: undefined } : m))
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))
            const res = await kaelRoute({ dossierId, message: text, history, sessionId })
            if (res.sessionId) setSessionId(res.sessionId)
            const responseMsg = res.response ?? res.message ?? "Réponse reçue."
            // Client guard: if no choices and no routing and no missionProposal → inject generic choices
            const responseChoices: string[] | undefined = res.choices?.length
                ? res.choices
                : !res.routedPole && !res.missionProposal
                    ? ["Consulter un expert", "Voir l'état du projet", "Poser une autre question"]
                    : undefined
            const resolvedManager = res.routedManager ?? res.routedPoleData?.managerName
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: "kael",
                content: responseMsg,
                timestamp: new Date().toISOString(),
                choices: responseChoices,
                missionProposal: res.missionProposal ? {
                    ...res.missionProposal,
                    objective: (res.missionProposal as any).initialObjective ?? res.missionProposal.objective ?? "",
                } : undefined,
                // Routing — store for button, do NOT auto-redirect
                routedPole: res.routedPole ?? undefined,
                routedManager: resolvedManager ?? undefined,
                routingReason: res.routingReason ?? undefined,
            }])
            // Play sound
            playSound()
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "kael", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    const kaelAvatar = (
        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/25 shrink-0">
            <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
        </div>
    )

    return (
        <PanelShell
            onClose={onClose}
            className="left-1/2 -translate-x-1/2"
            header={
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05] shrink-0 bg-gradient-to-r from-primary/[0.08] to-transparent relative z-[1]">
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-primary/15 border border-primary/25 shrink-0 shadow-sm transition-transform hover:scale-105">
                        <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold tracking-tight">KAEL</p>
                        <p className="text-[10px] text-white/35">Assistant · Vue globale</p>
                    </div>
                    {currentLab && (
                        <Badge variant="outline" className="text-[9px] h-5 border-primary/25 text-primary/70">
                            {currentLab.replace(/_/g, " ")}
                        </Badge>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            }
        >
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.map((msg, i) => {
                    // Intermediate mission update — compact progress line
                    if (msg.isMissionUpdate) {
                        return <MissionUpdateBubble key={msg.id} content={msg.content} />
                    }
                    // Mission status (launched / cancelled / failed)
                    if (msg.isMissionStatus) {
                        return (
                            <div key={msg.id} className="flex justify-center">
                                <span className="text-[10px] text-white/25 italic px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                                    {msg.content}
                                </span>
                            </div>
                        )
                    }
                    // Mission result bubble
                    if (msg.missionResult) {
                        return (
                            <div key={msg.id} className="flex gap-2">
                                <div className="shrink-0 mt-0.5">{kaelAvatar}</div>
                                <div className="flex-1 min-w-0">
                                    <MissionResultBubble result={msg.missionResult} dossierId={dossierId} />
                                </div>
                            </div>
                        )
                    }
                    const isLastKael = msg.role === "kael" && !sending && messages.slice(i + 1).every((m) => m.role !== "kael")
                    const hasProposal = isLastKael && !!msg.missionProposal
                    const hasRouting = !!msg.routedPole && !!msg.routedManager
                    return (
                        <div key={msg.id}>
                            <MessageBubble
                                msg={isLastKael ? msg : { ...msg, choices: undefined }}
                                avatar={kaelAvatar}
                                onChoiceSelect={isLastKael && !hasProposal && !hasRouting ? (c) => handleSend(c) : undefined}
                                choicesDisabled={sending}
                            />
                            {hasRouting && onRouteToPole && (
                                <div className="pl-8 mt-1.5">
                                    <button
                                        onClick={() => { onClose(); onRouteToPole(msg.routedPole!, msg.routedManager!, msg.routingReason) }}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 hover:border-white/15 transition-all text-left w-full group"
                                    >
                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10">
                                            <img src={getExpertImage(msg.routedManager!)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white/40 uppercase tracking-wide">Ouvrir session</p>
                                            <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">{normalizeManagerName(msg.routedManager!).toUpperCase()}</p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                                    </button>
                                </div>
                            )}
                            {hasProposal && sessionId && (
                                <div className="pl-8">
                                    <MissionProposalCard
                                        proposal={msg.missionProposal!}
                                        dossierId={dossierId}
                                        kaelSessionId={sessionId}
                                        disabled={sending || !!activeMissionId}
                                        onMissionLaunched={(id) => {
                                            setActiveMissionId(id)
                                            setMessages((prev) => [...prev, {
                                                id: crypto.randomUUID(),
                                                role: "kael",
                                                content: `Mission lancée — **${normalizeManagerName(msg.missionProposal!.managerName).toUpperCase()}** est en route.`,
                                                timestamp: new Date().toISOString(),
                                                isMissionStatus: true,
                                                missionId: id,
                                            }])
                                        }}
                                        onMissionBriefed={onMissionBriefed ? (poleCode, managerName, poleSessionId, poleId, missionId) => {
                                            onClose()
                                            onMissionBriefed(poleCode, managerName, poleSessionId, poleId, missionId)
                                        } : undefined}
                                        onSessionInteractive={onSessionInteractiveToPole ? (poleCode, managerName, objective) => {
                                            onClose()
                                            onSessionInteractiveToPole(poleCode, managerName, objective)
                                        } : undefined}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
                {sending && <TypingIndicator avatar={kaelAvatar} />}
                <div ref={bottomRef} />
            </div>
            <ChatInput input={input} setInput={setInput} onSend={() => handleSend()} sending={sending} placeholder="Message à KAEL…" />
        </PanelShell>
    )
}

// ─── Pole Slide-Up Panel ──────────────────────────────────────────────────────

interface PoleSlideUpProps {
    pole: PoleData
    dossierId: string
    currentLab?: string
    onClose: () => void
    routingContext?: string // context from KAEL routing — auto-sends as first message
    initialInput?: string  // pre-fills input without auto-sending (session interactive)
    briefedSessionId?: string // session created by /api/kael/missions/brief — load directly
    briefedMissionId?: string // AutonomousMission to confirm in this session
}

export function PoleSlideUpPanel({ pole, dossierId, currentLab, onClose, routingContext, initialInput, briefedSessionId, briefedMissionId }: PoleSlideUpProps) {
    const { markUnread, clearUnread, notifSoundEnabled } = useWorkspaceStore()
    const [session, setSession] = useState<PoleSessionData | null>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [input, setInput] = useState(initialInput ?? "")
    const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
    const [savingMsgId, setSavingMsgId] = useState<string | null>(null)
    const [activeMission, setActiveMission] = useState<{ id: string; objective: string } | null>(null)
    // Track which mission plan has been confirmed (to hide the confirm card)
    const [confirmedMissionIds, setConfirmedMissionIds] = useState<Set<string>>(new Set())
    const bottomRef = useRef<HTMLDivElement>(null)
    const prevMsgCountRef = useRef(0)
    // Track if panel is visible (mounted = visible)
    const isVisibleRef = useRef(true)

    const { mutateAsync: startSession } = useStartPoleSession()
    const { mutateAsync: sendMessage, isPending: sending } = useSendPoleMessage()
    const { play: playSound } = useNotificationSound()

    const chatKey = `pole-${pole.id}`
    const gradient = POLE_GRADIENTS[pole.code] ?? "from-gray-600 to-gray-800"

    const { data: activeSessionData, isLoading: isLoadingSession } = useActivePoleSession(pole.id, dossierId)

    const handleSendRef = useRef<(text?: string) => void>(() => {})
    const autoSentRef = useRef(false)

    // Load briefed session directly if provided (from /api/kael/missions/brief)
    const briefedLoadDone = useRef(false)
    useEffect(() => {
        if (!briefedSessionId || briefedLoadDone.current || session) return
        briefedLoadDone.current = true
        fetch(`/api/poles/sessions/${briefedSessionId}`)
            .then((r) => r.json())
            .then((data) => {
                const s = data.data?.session ?? data.session
                if (s) {
                    setSession(s)
                    setMessages((s.messages ?? []) as Msg[])
                }
            })
            .catch(() => {})
    }, [briefedSessionId, session])

    // Initial load from active session
    useEffect(() => {
        if (session) return
        if (briefedSessionId) return // briefed session loaded above

        if (!isLoadingSession) {
            if (activeSessionData?.session) {
                setSession(activeSessionData.session)
                setMessages(activeSessionData.session.messages as Msg[])
            } else if (routingContext && !autoSentRef.current) {
                // KAEL routed here — auto-send routing context through normal handleSend path
                autoSentRef.current = true
                setTimeout(() => handleSendRef.current(routingContext), 50)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingSession, activeSessionData?.session?.id])

    // Clear unread when panel opens, mark not visible on unmount
    useEffect(() => {
        clearUnread(chatKey)
        isVisibleRef.current = true
        return () => { isVisibleRef.current = false }
    }, [chatKey, clearUnread])

    // First load → instant (before paint). prevMsgCountRef only updated in useEffect below.
    useLayoutEffect(() => {
        if (messages.length > 0 && prevMsgCountRef.current === 0) {
            bottomRef.current?.scrollIntoView()
        }
    }, [messages])

    // Subsequent new messages → smooth
    useEffect(() => {
        const isFirst = prevMsgCountRef.current === 0
        prevMsgCountRef.current = messages.length
        if (isFirst || messages.length === 0) return
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Mission polling — fetch once then poll every 5s while RUNNING/PENDING
    useEffect(() => {
        type MissionData = { id: string; poleCode: string; objective: string; status: string; result?: { summary?: string } | null }

        function fetchMissions() {
            fetch(`/api/kael/missions?dossierId=${dossierId}`)
                .then((r) => r.json())
                .then((data: unknown) => {
                    const missions = Array.isArray(data) ? data as MissionData[] : []
                    const active = missions.find((m) => m.poleCode === pole.code && (m.status === "RUNNING" || m.status === "PENDING"))
                    const done = missions.find((m) => m.poleCode === pole.code && m.status === "DONE" && m.result?.summary)

                    setActiveMission(prev => {
                        // Mission just completed → inject result as manager message
                        if (prev && !active && done?.result?.summary) {
                            setMessages(msgs => {
                                const alreadyInjected = msgs.some(m => m.id === `mission-result-${done.id}`)
                                if (alreadyInjected) return msgs
                                return [...msgs, {
                                    id: `mission-result-${done.id}`,
                                    role: "manager" as const,
                                    content: done.result!.summary!,
                                    timestamp: new Date().toISOString(),
                                }]
                            })
                            return null
                        }
                        return active ?? null
                    })
                })
                .catch(() => {})
        }

        fetchMissions()
        const interval = setInterval(fetchMissions, 5000)
        return () => clearInterval(interval)
    }, [dossierId, pole.code])

    async function handleSend(textOverride?: string) {
        const text = (textOverride ?? input).trim()
        if (!text || sending) return
        if (!textOverride) setInput("")
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            if (!session) {
                const result = await startSession({ poleId: pole.id, dossierId, userMessage: text, currentLab })
                setSession(result.session)
                setMessages(result.session.messages as Msg[])
            } else {
                const result = await sendMessage({ sessionId: session.id, userMessage: text })
                setSession(result.session)
                setMessages(result.session.messages as Msg[])
            }
            // Sound feedback on manager reply
            if (notifSoundEnabled) playSound()
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "manager", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    // Keep ref in sync so the initial-load useEffect can call handleSend without stale closure
    useEffect(() => { handleSendRef.current = handleSend })

    async function handleSaveAsCard(msg: Msg) {
        if (savingMsgId || savedMsgIds.has(msg.id)) return
        setSavingMsgId(msg.id)
        try {
            await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dossierId, title: msg.content.split("\n")[0].slice(0, 120) || "Note",
                    content: { text: msg.content }, cardType: "ANALYSIS", poleCode: pole.code, source: "EXPERT",
                }),
            })
            setSavedMsgIds((prev) => { const next = new Set(prev); next.add(msg.id); return next })
        } finally { setSavingMsgId(null) }
    }

    const displayManagerName = normalizeManagerName(pole.managerName)
    const imgSrc = getExpertImage(pole.managerName)

    const managerAvatar = (
        <div className={cn("w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br shrink-0", gradient)}>
            <img src={imgSrc} alt={displayManagerName} className="w-full h-full object-cover" />
        </div>
    )

    return (
        <PanelShell
            onClose={onClose}
            className="left-1/2 -translate-x-1/2"
            header={
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05] shrink-0 relative z-[1]">
                    {/* Subtle gradient tint from pole color */}
                    <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r to-transparent pointer-events-none", gradient)} />
                    <div className={cn("w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br shadow-lg shrink-0 transition-transform hover:scale-105", gradient)}>
                        <img src={imgSrc} alt={displayManagerName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-tight">{displayManagerName.toUpperCase()}</p>
                        <p className="text-[10px] text-white/35">{pole.code.replace(/_/g, " ")}</p>
                    </div>
                    {currentLab && (
                        <Badge variant="outline" className="text-[9px] h-5 border-white/15 text-white/40">
                            {currentLab.replace(/_/g, " ")}
                        </Badge>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            }
        >
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {isLoadingSession && !session ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                    </div>
                ) : (
                    <>
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
                            <div key={msg.id}>
                                <MessageBubble
                                    msg={msg}
                                    avatar={managerAvatar}
                                    onSave={msg.role === "manager" && session && !msg.isMissionPlan ? () => handleSaveAsCard(msg) : undefined}
                                    saving={savingMsgId === msg.id}
                                    saved={savedMsgIds.has(msg.id)}
                                />
                                {/* Mission plan confirmation card */}
                                {msg.isMissionPlan && briefedMissionId && !confirmedMissionIds.has(briefedMissionId) && (
                                    <MissionConfirmCard
                                        missionId={briefedMissionId}
                                        poleSessionId={session?.id ?? briefedSessionId ?? ""}
                                        estimatedCost={msg.estimatedCost ?? 1}
                                        dossierId={dossierId}
                                        onConfirmed={() => {
                                            setConfirmedMissionIds((prev) => { const next = new Set(prev); next.add(briefedMissionId!); return next })
                                        }}
                                        onCancelled={() => {
                                            setConfirmedMissionIds((prev) => { const next = new Set(prev); next.add(briefedMissionId!); return next })
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                        {sending && <TypingIndicator avatar={managerAvatar} />}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>
            <ChatInput input={input} setInput={setInput} onSend={handleSend} sending={sending} placeholder={`Message à ${displayManagerName.toUpperCase()}…`} />
        </PanelShell>
    )
}

// ─── Manager greetings ────────────────────────────────────────────────────────

function getManagerGreeting(name: string): string {
    const checkName = normalizeManagerName(name).toUpperCase()

    const greetings: Record<string, string> = {
        AXEL: "Bonjour. Je suis AXEL, ton Directeur Stratégie & Innovation.\n\nJe challenge les idées sans ménagement et valide ce qui est solide. Sur quel défi stratégique travaillons-nous ?",
        MAYA: "Bonjour. Je suis MAYA, ta Directrice Market & Intelligence.\n\nJe produis de l'intelligence marché pour décider, pas juste informer. Quel marché veux-tu analyser ?",
        KAI: "Bonjour. Je suis KAI, ton Architecte Produit & Tech.\n\nJe transforme les idées en plans d'implémentation actionnables. Décris-moi ce que tu veux construire.",
        ELENA: "Bonjour. Je suis ELENA, ta Directrice Financière.\n\nJe travaille toujours avec des hypothèses explicites. Quel modèle économique modélisons-nous ?",
        SKY: "Bonjour. Je suis SKY, ta Chief Marketing Officer.\n\nJe construis des marques qui convertissent. Quel projet de marque travaillons-nous ?",
        MARCUS: "Bonjour. Je suis MARCUS, ton Conseiller Juridique.\n\nJ'identifie les risques et propose des solutions concrètes. Quel risque légal veux-tu traiter ?",
        NOVA: "Bonjour. Je suis NOVA, ta Directrice des Opérations.\n\nQuels sont tes besoins en ressources ou coordination ?",
    }
    return greetings[checkName] ?? `Bonjour, je suis ${checkName}. Comment puis-je vous aider ?`
}
