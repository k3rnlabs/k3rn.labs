"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDossier } from "@/hooks/use-dossier"
import { useLab, useTransitionLab } from "@/hooks/use-lab"
import { usePoles } from "@/hooks/use-poles"
import { CanvasView } from "@/components/canvas/CanvasView"
import { Dock } from "@/components/workspace/Dock"
import { FloatingWorkspaceInfo } from "@/components/workspace/FloatingWorkspaceInfo"
import { KaelSlideUpPanel, PoleSlideUpPanel } from "@/components/workspace/SlideUpPanel"
import { TaskPanel } from "@/components/workspace/TaskPanel"
import { MobileOrchestrator } from "@/components/workspace/MobileOrchestrator"
import { KaelCommandBar } from "@/components/poles/kael-command-bar"
import { PermissionGate } from "@/components/ui/permission-gate"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ChevronLeft, Download, DollarSign } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { PoleData } from "@/hooks/use-poles"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { POLE_CONFIG } from "@/components/workspace/Dock"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"

/**
 * WorkspacePage — The Unified Cognitive Surface
 *
 * Layout:
 *  ├── Header bar (top)
 *  ├── WorkspaceSidebar (left, collapsible)
 *  ├── CanvasView (main, flex-1)
 *  │   └── Dock (floating bottom-center — glass liquid hub)
 *  └── SlideUpPanel (KAEL or Expert — modal above Dock)
 */
export default function WorkspacePage() {
    const { dossierId } = useParams<{ dossierId: string }>()
    const router = useRouter()
    const { data: dossier, isLoading, isFetching } = useDossier(dossierId)
    const { data: labData } = useLab(dossierId)
    const { mutate: transitionLab, isPending: transitioning } = useTransitionLab()
    const { data: poles = [] } = usePoles()

    const { setActiveDossier, activeSubFolderId, openPoleChat, markUnread } = useWorkspaceStore()

    // Active panel state — null | "kael" | pole id
    const [activePanel, setActivePanel] = useState<null | "kael" | string>(null)
    const [poleRoutingContext, setPoleRoutingContext] = useState<string | undefined>(undefined)
    const [poleInitialInput, setPoleInitialInput] = useState<string | undefined>(undefined)
    const [taskPanelOpen, setTaskPanelOpen] = useState(false)
    // Mission briefing — store briefed session + mission for PoleSlideUpPanel
    const [briefedSession, setBriefedSession] = useState<{ poleId: string; sessionId: string; missionId: string } | null>(null)

    // Exclusive overlay state: only one of palette or kaelBar can be open at a time
    const closePaletteRef = useRef<(() => void) | null>(null)
    const closeKaelBarRef = useRef<(() => void) | null>(null)

    const currentLab = labData?.labState?.currentLab as string | undefined

    useEffect(() => {
        setActiveDossier(dossierId)
        return () => setActiveDossier(null)
    }, [dossierId, setActiveDossier])

    // Init KAEL opener proactively — creates session if none exists, badges the button
    const kaelInitDone = useRef(false)
    useEffect(() => {
        if (kaelInitDone.current || !dossierId) return
        // Wait until onboarding is confirmed complete before init
        const onboardingStep = (dossier as any)?.onboardingState?.step
        if (onboardingStep !== "COMPLETE") return
        kaelInitDone.current = true
        // Init KAEL session + badge
        fetch(`/api/kael/init?dossierId=${dossierId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.data?.isNew || data.data?.hasUnread) {
                    markUnread("kael")
                }
            })
            .catch(() => {})
        // Fetch all unread keys (kael + poles) and badge them
        fetch(`/api/kael/unread?dossierId=${dossierId}`)
            .then((r) => r.json())
            .then((data) => {
                const keys: string[] = data.data?.unread ?? []
                keys.forEach((key) => markUnread(key))
            })
            .catch(() => {})
    }, [dossierId, dossier, markUnread])

    // Close panel on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActivePanel(null) }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    if (isLoading) {
        return (
            <div className="h-dvh bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/logo-icon/logo.svg"
                        alt="k3rn"
                        width={48}
                        height={48}
                        className="animate-spin-double drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                    />
                    <p className="text-sm text-white/40 animate-pulse tracking-wide">Chargement du workspace…</p>
                </div>
            </div>
        )
    }

    if (!dossier) return <div className="p-8 text-destructive">Dossier not found</div>

    // Gate: redirect to onboarding if not completed.
    // Guard: if still fetching (stale cache), wait for fresh data before deciding to redirect —
    // avoids bouncing back to onboarding right after completion due to a stale TanStack Query cache.
    const onboardingStep = (dossier.onboardingState as { step?: string } | null)?.step
    if (onboardingStep !== "COMPLETE") {
        if (isFetching) {
            return (
                <div className="h-dvh bg-[#0a0a0a] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src="/logo-icon/logo.svg"
                            alt="k3rn"
                            width={48}
                            height={48}
                            className="animate-spin-double drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                        />
                        <p className="text-sm text-white/40 animate-pulse tracking-wide">Chargement du workspace…</p>
                    </div>
                </div>
            )
        }
        router.replace(`/dossiers/${dossierId}/onboarding`)
        return null
    }

    const subFolders = dossier.subFolders ?? []

    // Find active pole data for panel
    const activePole = activePanel && activePanel !== "kael"
        ? poles.find((p: PoleData) => p.id === activePanel) ?? null
        : null

    function handleOpenKael() {
        setActivePanel((prev) => prev === "kael" ? null : "kael")
    }

    function handleOpenPole(poleId: string, poleCode: string, managerName: string, routingContext?: string, initialInput?: string) {
        openPoleChat(poleId, poleCode, managerName) // keep store in sync for Dock active state
        setPoleRoutingContext(routingContext)
        setPoleInitialInput(initialInput)
        setBriefedSession(null) // clear briefed session when opening normally
        setActivePanel((prev) => prev === poleId ? null : poleId)
    }

    function handleMissionBriefed(poleCode: string, managerName: string, poleSessionId: string, poleId: string, missionId: string) {
        openPoleChat(poleId, poleCode, managerName)
        setPoleRoutingContext(undefined)
        setBriefedSession({ poleId, sessionId: poleSessionId, missionId })
        markUnread(`pole-${poleId}`)
        setActivePanel(poleId)
    }

    // ── Mobile surface (< md) ──
    const mobileView = (
        <div className="md:hidden h-dvh">
            <MobileOrchestrator
                dossierId={dossierId}
                currentLab={currentLab}
                dossierName={dossier.name}
            />
        </div>
    )

    return (
        <>
            {mobileView}
            <div className="hidden md:flex h-dvh overflow-hidden bg-[#0a0a0a] flex-col">
                {/* ── Header ── */}
                <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] shrink-0 bg-black/30 backdrop-blur-sm z-30">
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/30 hover:text-white/70 h-7 px-2 text-xs"
                            onClick={() => router.push("/home")}
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                            Dossiers
                        </Button>
                        <Separator orientation="vertical" className="h-4 opacity-20" />
                        <span className="text-sm font-semibold text-white/90">{dossier.name}</span>
                        {currentLab && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                {currentLab.replace(/_/g, " ")}
                            </span>
                        )}
                        <Separator orientation="vertical" className="h-4 opacity-20 mx-1" />

                        {/* ── Recommended Experts ── */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-white/25 font-bold">Recommendations:</span>
                            <div className="flex -space-x-2">
                                <TooltipProvider>
                                    {poles
                                        .filter(p => currentLab && (p.activePriorityLabs as string[]).includes(currentLab))
                                        .map(pole => {
                                            const role = (POLE_CONFIG[pole.code]?.title || "Expert").split(" ").pop(); // Just the last word for brief display or use title
                                            const fullName = pole.managerName;
                                            const displayManagerName = normalizeManagerName(fullName);
                                            const roleTitle = POLE_CONFIG[pole.code]?.title || "Expert";
                                            const imgSrc = getExpertImage(fullName);

                                            return (
                                                <Tooltip key={pole.id}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => handleOpenPole(pole.id, pole.code, pole.managerName)}
                                                            className="group relative"
                                                        >
                                                            <div className="w-7 h-7 rounded-full border-2 border-[#0a0a0a] bg-black overflow-hidden hover:scale-110 transition-transform hover:z-10 relative">
                                                                <img
                                                                    src={imgSrc}
                                                                    alt={displayManagerName}
                                                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                                                                />
                                                                <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                                                            </div>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[11px]">
                                                        <p className="font-bold">{displayManagerName.toUpperCase()}</p>
                                                        <p className="text-white/60">{roleTitle}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <KaelCommandBar
                            dossierId={dossierId}
                            currentLab={currentLab}
                            onSelectPole={(pole) => handleOpenPole(pole.id, pole.code, pole.managerName)}
                            onOpen={() => closePaletteRef.current?.()}
                            closeRef={closeKaelBarRef}
                        />
                        <PermissionGate dossierId={dossierId} permission="canCreateCrowdfunding">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-white/40 hover:text-white/80"
                                onClick={() => router.push(`/dossiers/${dossierId}/crowdfunding`)}>
                                <DollarSign className="h-3.5 w-3.5 mr-1" />
                                Crowdfunding
                            </Button>
                        </PermissionGate>
                        <PermissionGate dossierId={dossierId} permission="canExport">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-white/40 hover:text-white/80"
                                onClick={() => router.push(`/dossiers/${dossierId}/export`)}>
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Export
                            </Button>
                        </PermissionGate>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="flex flex-1 overflow-hidden min-h-0 relative">
                    {/* Canvas */}
                    <CanvasView
                        dossierId={dossierId}
                        subFolderId={activeSubFolderId ?? undefined}
                        onOpenPole={(poleCode) => {
                            const pole = poles.find((p) => p.code === poleCode)
                            if (pole) handleOpenPole(pole.id, pole.code, pole.managerName)
                        }}
                    />

                    {/* Floating Workspace Info - Replaces Sidebar */}
                    <FloatingWorkspaceInfo
                        dossierId={dossierId}
                        labData={labData}
                        onTransitionLab={() => transitionLab(dossierId)}
                        transitioning={transitioning}
                    />

                    {/* Dock — glass liquid hub */}
                    <Dock
                        dossierId={dossierId}
                        poles={poles}
                        subFolders={subFolders}
                        currentLab={currentLab}
                        onOpenKael={handleOpenKael}
                        onOpenPole={handleOpenPole}
                        onPaletteChange={(open) => { if (open) closeKaelBarRef.current?.() }}
                        closePaletteRef={closePaletteRef}
                        onOpenTasks={() => setTaskPanelOpen((v) => !v)}
                    />
                </div>

                {/* ── Slide-Up Panels ── */}
                {activePanel === "kael" && (
                    <KaelSlideUpPanel
                        dossierId={dossierId}
                        currentLab={currentLab}
                        onClose={() => setActivePanel(null)}
                        onRouteToPole={(poleCode, managerName, routingReason) => {
                            const pole = poles.find((p) => p.code === poleCode)
                            if (pole) handleOpenPole(pole.id, pole.code, managerName || pole.managerName, routingReason, undefined)
                        }}
                        onSessionInteractiveToPole={(poleCode, managerName, objective) => {
                            const pole = poles.find((p) => p.code === poleCode)
                            if (pole) handleOpenPole(pole.id, pole.code, managerName || pole.managerName, undefined, objective)
                        }}
                        onMissionBriefed={(poleCode, managerName, poleSessionId, poleId, missionId) => {
                            handleMissionBriefed(poleCode, managerName, poleSessionId, poleId, missionId)
                        }}
                    />
                )}
                {activePole && (
                    <PoleSlideUpPanel
                        pole={activePole}
                        dossierId={dossierId}
                        currentLab={currentLab}
                        onClose={() => { setActivePanel(null); setPoleRoutingContext(undefined); setPoleInitialInput(undefined); setBriefedSession(null) }}
                        routingContext={poleRoutingContext}
                        initialInput={poleInitialInput}
                        briefedSessionId={briefedSession?.poleId === activePole.id ? briefedSession.sessionId : undefined}
                        briefedMissionId={briefedSession?.poleId === activePole.id ? briefedSession.missionId : undefined}
                    />
                )}
                {taskPanelOpen && (
                    <TaskPanel
                        dossierId={dossierId}
                        onClose={() => setTaskPanelOpen(false)}
                    />
                )}
            </div>
        </>
    )
}
