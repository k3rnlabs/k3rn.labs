"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Tag, Layers, FlaskConical, X, User, Settings, MessageCircle, Zap, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useNotificationSettings } from "@/hooks/use-notification-settings"
import { useMissionBudget } from "@/hooks/use-mission-budget"
import { CreditsModal } from "@/components/billing/CreditsModal"

const LAB_OPTIONS = [
    { value: "DISCOVERY", label: "Discovery" },
    { value: "STRUCTURATION", label: "Structuration" },
    { value: "VALIDATION_MARCHE", label: "Market Validation" },
    { value: "DESIGN_PRODUIT", label: "Product Design" },
    { value: "ARCHITECTURE_TECHNIQUE", label: "Tech Architecture" },
    { value: "BUSINESS_FINANCE", label: "Business & Finance" },
]

function parseTagLabel(raw: string): { label: string; color: string } {
    const idx = raw.lastIndexOf(":")
    if (idx === -1) return { label: raw, color: "#8b5cf6" }
    return { label: raw.slice(0, idx), color: raw.slice(idx + 1) }
}

interface HomeDockProps {
    allTags: string[]
    filterTags: string[]
    onFilterTagsChange: (tags: string[]) => void
    filterLab: string | null
    onFilterLabChange: (lab: string | null) => void
    showArchived: boolean
    onShowArchivedChange: (v: boolean) => void
    onNewDossier: () => void
}

type OpenPanel = "tags" | "status" | "lab" | "profile" | null

function DockButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode
    label: string
    active?: boolean
    onClick: () => void
}) {
    const [hovered, setHovered] = useState(false)

    return (
        <div className="relative flex flex-col items-center">
            {/* Tooltip */}
            <div className={cn(
                "absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none transition-all duration-150 z-10",
                "bg-black/90 text-white/90 backdrop-blur-sm border border-white/[0.08]",
                "shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
                hovered ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-0"
            )}>
                {label}
            </div>

            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={cn(
                    "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 select-none overflow-hidden",
                    hovered ? "scale-110" : "scale-100",
                    active
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                )}
            >
                {icon}
                {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
            </button>
        </div>
    )
}

export function HomeDock({
    allTags,
    filterTags,
    onFilterTagsChange,
    filterLab,
    onFilterLabChange,
    showArchived,
    onShowArchivedChange,
    onNewDossier,
}: HomeDockProps) {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
    const ref = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { profile } = useUserProfile()
    const { settings: notifSettings } = useNotificationSettings()
    const { data: budget } = useMissionBudget()
    const [creditsModalOpen, setCreditsModalOpen] = useState(false)

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpenPanel(null)
        }
        document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [])

    function togglePanel(p: OpenPanel) {
        setOpenPanel((prev) => (prev === p ? null : p))
    }

    function toggleTag(tag: string) {
        onFilterTagsChange(
            filterTags.includes(tag) ? filterTags.filter((t) => t !== tag) : [...filterTags, tag]
        )
    }

    const hasActiveFilter = filterTags.length > 0 || filterLab !== null || showArchived

    return (
        <div ref={ref} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} currentBudget={budget?.total} />

            {/* Panels */}
            {openPanel === "tags" && (
                <div className={cn(
                    "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 rounded-2xl p-4",
                    "border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "animate-in slide-in-from-bottom-2 duration-200"
                )}>
                    <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-3">Filtrer par tag</p>
                    {allTags.length === 0 ? (
                        <p className="text-xs text-zinc-600">Aucun tag créé</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {allTags.map((t) => {
                                const { label, color } = parseTagLabel(t)
                                const active = filterTags.includes(t)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => toggleTag(t)}
                                        className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all border", active ? "border-opacity-60" : "border-zinc-800 hover:border-zinc-700")}
                                        style={active ? { backgroundColor: color + "22", color, borderColor: color + "66" } : {}}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {filterTags.length > 0 && (
                        <button onClick={() => onFilterTagsChange([])} className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                            <X className="h-2.5 w-2.5" /> Effacer
                        </button>
                    )}
                </div>
            )}

            {openPanel === "status" && (
                <div className={cn(
                    "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 rounded-2xl p-2",
                    "border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "animate-in slide-in-from-bottom-2 duration-200"
                )}>
                    <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2 px-2">Statut</p>
                    {[
                        { label: "Tous", value: false, isArchived: null },
                        { label: "Actifs", value: false, isArchived: false },
                        { label: "Archivés", value: true, isArchived: true },
                    ].map(({ label, value }) => (
                        <button
                            key={label}
                            onClick={() => { onShowArchivedChange(value); setOpenPanel(null) }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all",
                                (label === "Archivés" ? showArchived : label === "Tous" ? !showArchived : !showArchived)
                                    ? "bg-primary/10 text-primary"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {openPanel === "profile" && (
                <div className={cn(
                    "absolute bottom-full mb-3 right-0 w-64 rounded-2xl p-4",
                    "border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "animate-in slide-in-from-bottom-2 duration-200"
                )}>
                    {/* Avatar + nom */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
                            {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/[0.06] text-white/50">
                                    {profile?.firstName ? (
                                        <span className="text-[11px] font-bold font-jakarta">
                                            {profile.firstName[0]}{profile.lastName?.[0] ?? ""}
                                        </span>
                                    ) : (
                                        <User className="h-4 w-4" />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-jakarta font-semibold text-white/90 truncate">
                                {profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "Mon profil"}
                            </p>
                            <p className="text-[11px] text-white/30 truncate">{profile?.email ?? ""}</p>
                        </div>
                    </div>

                    {/* Budget missions — cliquable */}
                    <button
                        onClick={() => { setOpenPanel(null); setCreditsModalOpen(true) }}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.10] p-3 mb-3 transition-all duration-150 group text-left"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-jakarta tracking-widest text-white/30 uppercase group-hover:text-white/50 transition-colors">Missions</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-jakarta font-bold text-white/80">
                                    {budget?.total ?? "—"}
                                    <span className="text-white/25 font-normal">
                                        /{budget?.allowance ?? 5}
                                    </span>
                                </span>
                                <Zap className="h-3 w-3 text-primary/60 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                        <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all duration-700",
                                    (budget?.total ?? 5) <= 2 ? "bg-red-400/70" :
                                    (budget?.total ?? 5) <= 5 ? "bg-amber-400/70" : "bg-white/40"
                                )}
                                style={{
                                    width: budget != null
                                        ? `${Math.min(100, (budget.allowanceLeft / budget.allowance) * 100)}%`
                                        : "0%"
                                }}
                            />
                        </div>
                        <p className="text-[9px] text-white/20 group-hover:text-white/35 mt-1.5 transition-colors">Recharger les missions →</p>
                    </button>

                    {/* Accès badge */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-jakarta tracking-widest text-white/30 uppercase">Accès</span>
                        <span className={cn(
                            "text-[10px] font-jakarta font-bold tracking-widest uppercase px-2 py-0.5 rounded-md",
                            profile?.plan === "PRO"
                                ? "bg-primary/15 text-primary border border-primary/30"
                                : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                        )}>
                            {profile?.plan === "PRO" ? "Pro" : "Early Access"}
                        </span>
                    </div>

                    {/* Telegram CTA si non configuré */}
                    {notifSettings !== null && !notifSettings?.telegramChatId && (
                        <button
                            onClick={() => { router.push("/settings?tab=preferences"); setOpenPanel(null) }}
                            className="w-full text-left px-3 py-2 mb-1 rounded-lg text-xs text-blue-400/80 hover:text-blue-300 hover:bg-blue-500/[0.08] border border-blue-500/15 hover:border-blue-500/30 transition-all flex items-center gap-2"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Connecter Telegram
                        </button>
                    )}

                    {/* Lien settings */}
                    <button
                        onClick={() => { router.push("/settings"); setOpenPanel(null) }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all flex items-center gap-2"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Ouvrir les paramètres
                    </button>
                </div>
            )}

            {openPanel === "lab" && (
                <div className={cn(
                    "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 rounded-2xl p-2",
                    "border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "animate-in slide-in-from-bottom-2 duration-200"
                )}>
                    <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2 px-2">Phase / Lab</p>
                    {filterLab && (
                        <button
                            onClick={() => { onFilterLabChange(null); setOpenPanel(null) }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all flex items-center gap-1.5"
                        >
                            <X className="h-3 w-3" /> Tous les labs
                        </button>
                    )}
                    {LAB_OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => { onFilterLabChange(value); setOpenPanel(null) }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all",
                                filterLab === value
                                    ? "bg-primary/10 text-primary"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Dock bar */}
            <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl">
                {/* Unified Background Layer (with clipping) */}
                <div className={cn(
                    "absolute inset-0 rounded-2xl overflow-hidden pointer-events-none",
                    "border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]",
                )}>
                    {/* Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.025] to-transparent" />
                    {/* Left edge glow */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                </div>

                {/* Content Layer (no clipping) */}
                <div className="flex items-center gap-1.5 relative z-10">
                    <DockButton
                        icon={<Tag className="h-4 w-4" />}
                        label="Tags"
                        active={filterTags.length > 0 || openPanel === "tags"}
                        onClick={() => togglePanel("tags")}
                    />

                    <DockButton
                        icon={<Layers className="h-4 w-4" />}
                        label="Statut"
                        active={showArchived || openPanel === "status"}
                        onClick={() => togglePanel("status")}
                    />

                    <DockButton
                        icon={<FlaskConical className="h-4 w-4" />}
                        label="Lab"
                        active={filterLab !== null || openPanel === "lab"}
                        onClick={() => togglePanel("lab")}
                    />

                    {hasActiveFilter && (
                        <>
                            <div className="w-px h-6 bg-white/[0.07] mx-1 shrink-0" />
                            <button
                                onClick={() => { onFilterTagsChange([]); onFilterLabChange(null); onShowArchivedChange(false) }}
                                className="text-[10px] text-white/30 hover:text-white/60 px-2 flex items-center gap-1 transition-colors"
                            >
                                <X className="h-3 w-3" /> Reset
                            </button>
                        </>
                    )}

                    <DockButton
                        icon={<Sparkles className="h-4 w-4 text-purple-400" />}
                        label="Studio DA"
                        onClick={() => router.push("/visual-engine/studio")}
                    />

                    <div className="w-px h-6 bg-white/[0.07] mx-1 shrink-0" />

                    <DockButton
                        icon={<User className="h-4 w-4" />}
                        label="Mon profil"
                        active={openPanel === "profile"}
                        onClick={() => togglePanel("profile")}
                    />

                    <div className="w-px h-6 bg-white/[0.07] mx-1 shrink-0" />

                    <DockButton
                        icon={<Plus className="h-4 w-4" />}
                        label="Nouveau dossier"
                        onClick={onNewDossier}
                    />
                </div>
            </div>
        </div>
    )
}
