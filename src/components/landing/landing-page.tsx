"use client"

import Link from "next/link"
import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"

// ─── Managers K3RN — 7 pôles experts ─────────────────────────────────────────
const MANAGERS = [
    { name: "AXEL", code: "P01", title: "Directeur Stratégie & Innovation", tagline: "GO / NO–GO", desc: "Challenge systématique et positionnement.", hashtags: ["#pitch", "#stratégie", "#brainstorming"], color: "#7c3aed", initiale: "A", avatar: "/images/experts/Axel_transparent.webp", salary: 85000 },
    { name: "MAYA", code: "P02", title: "Directrice Market & Intelligence", tagline: "TAM · SAM · SOM", desc: "Analyse marché et fenêtres d'opportunité.", hashtags: ["#market", "#veille", "#concurrents"], color: "#2563eb", initiale: "M", avatar: "/images/experts/Maya_transparent.webp", salary: 90000 },
    { name: "KAI", code: "P03", title: "Architecte Produit & Tech", tagline: "MVP · STACK", desc: "Décomposition et plan d'implémentation.", hashtags: ["#mvp", "#tech", "#stack"], color: "#059669", initiale: "K", avatar: "/images/experts/Kai_transparent.webp", salary: 95000 },
    { name: "ELENA", code: "P04", title: "Directrice Financière", tagline: "P&L · BREAK-EVEN", desc: "Business model et projections 12–36 mois.", hashtags: ["#finance", "#budget", "#investisseur"], color: "#d97706", initiale: "E", avatar: "/images/experts/Elena_transparent.webp", salary: 140000 },
    { name: "SKY", code: "P05", title: "Chief Marketing Officer", tagline: "COPY · GROWTH", desc: "Brand strategy et campagnes de lancement.", hashtags: ["#marketing", "#brand", "#seo"], color: "#db2777", initiale: "S", avatar: "/images/experts/Sky_transparent.webp", salary: 110000 },
    { name: "MARCUS", code: "P06", title: "Conseiller Juridique", tagline: "RGPD · CONTRATS", desc: "Structure légale et conformité sectorielle.", hashtags: ["#legal", "#rgpd", "#contrat"], color: "#64748b", initiale: "M", avatar: "/images/experts/Marcus_transparent.webp", salary: 130000 },
    { name: "NOVA", code: "P07", title: "Directrice des Opérations", tagline: "TALENT · OPS", desc: "Sourcing talent et coordination inter-pôles.", hashtags: ["#talent", "#ops", "#recrutement"], color: "#ea580c", initiale: "N", avatar: "/images/experts/Nova_transparent.webp", salary: 120000 },
]

const STEPS = [
    { n: "01", title: "Briefing instantané", desc: "Partagez votre idée à KAEL — en quelques échanges, il identifie le besoin, la cible, les enjeux. Pas de formulaire, pas de template." },
    { n: "02", title: "Équipe activée", desc: "KAEL route votre besoin vers le bon expert parmi les 7 pôles. Stratégie, finance, tech, juridique, marketing : l'output est direct, actionnable, sans générique." },
    { n: "03", title: "Lancement & optimisation", desc: "Chaque décision est mémorisée. Votre projet évolue, vos experts s'adaptent. Pilotez, ajustez, scalez — en continu." },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function ManagerAvatar({ name, initiale, color, avatar }: { name: string; initiale: string; color: string; avatar: string | null }) {
    if (avatar) return (
        <div className="relative w-full flex-1 min-h-0 mt-auto">
            {/* Animated particle cloud behind the expert */}
            <div className="hidden sm:block absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute w-32 h-32 rounded-full blur-[60px] opacity-[0.12] animate-[float1_8s_ease-in-out_infinite]"
                    style={{ backgroundColor: color, left: '20%', bottom: '30%' }}
                />
                <div
                    className="absolute w-24 h-24 rounded-full blur-[50px] opacity-[0.08] animate-[float2_10s_ease-in-out_infinite_1s]"
                    style={{ backgroundColor: color, right: '15%', bottom: '20%' }}
                />
                <div
                    className="absolute w-20 h-20 rounded-full blur-[40px] opacity-[0.10] animate-[float3_7s_ease-in-out_infinite_2s]"
                    style={{ backgroundColor: color, left: '50%', bottom: '50%' }}
                />
            </div>
            <img
                src={avatar}
                alt={name}
                loading="lazy"
                decoding="async"
                className="relative z-10 w-full h-full object-contain object-bottom transition-transform duration-700 ease-out group-hover:scale-[1.03] origin-bottom"
            />
        </div>
    )
    return (
        <div className="relative w-full flex-1 min-h-0 mt-auto flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center border border-white/[0.06] bg-white/[0.02]">
                <span className="text-3xl font-bold text-white/10">{initiale}</span>
            </div>
        </div>
    )
}

function ManagerCard({ m }: { m: typeof MANAGERS[0] }) {
    // Split tagline at "·", "/", or "–" for the mixed-type treatment
    const parts = m.tagline.split(/[·\/–]/).map(s => s.trim()).filter(Boolean)

    return (
        <div className="shrink-0 w-full sm:w-80 flex flex-col h-[600px] sm:h-[720px] group relative overflow-hidden border-b border-white/[0.04] sm:border-b-0">
            {/* Left color accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[2px] opacity-20 group-hover:opacity-70 transition-opacity duration-700"
                style={{ background: `linear-gradient(to bottom, transparent, ${m.color}, transparent)` }}
            />

            {/* Content */}
            <div className="flex flex-col px-6 sm:px-8 pt-4 pb-0 shrink-0">
                {/* Code + dot */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-jakarta tracking-wider text-white/25 uppercase">{m.code}</span>
                    <div
                        className="w-2 h-2 rounded-full transition-all duration-700 group-hover:scale-125"
                        style={{ backgroundColor: m.color }}
                    />
                </div>

                {/* Name — hero bold style */}
                <div className="mb-1 leading-none">
                    <span className="block text-[2.2rem] sm:text-[2.6rem] font-jakarta font-extrabold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/50 group-hover:to-white/70 transition-all duration-500">
                        {m.name}.
                    </span>
                </div>

                {/* Title — colored, uppercase mono */}
                <p
                    className="text-[9px] font-semibold uppercase tracking-[0.25em] mb-3"
                    style={{ color: m.color }}
                >{m.title}</p>

                {/* Tagline — hero  serif style */}
                <div className="mb-2">
                    {parts.length >= 2 ? (
                        <>
                            <p className="text-xl font-jakarta font-extrabold tracking-[-0.03em] text-white/75 leading-tight">
                                {parts[0]}.
                            </p>
                            <p className="text-xl font-serif italic text-white/50 leading-tight group-hover:text-white/70 transition-colors duration-500">
                                {parts[1]}.
                            </p>
                        </>
                    ) : (
                        <p className="text-xl font-jakarta  font-light text-white/40 leading-tight">
                            {m.tagline}.
                        </p>
                    )}
                </div>

                {/* Salary */}
                <div className="mb-3 flex items-baseline gap-1.5">
                    <span
                        className="text-xl font-jakarta font-extrabold tracking-tight"
                        style={{ color: m.color }}
                    >
                        {m.salary.toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-[9px] font-jakarta text-white/25 uppercase tracking-wider">/an</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {m.hashtags.map((h) => (
                        <span key={h} className="text-[8px] font-jakarta text-white/25 border border-white/[0.05] px-2.5 py-1 rounded-full uppercase tracking-wider group-hover:text-white/40 group-hover:border-white/[0.10] transition-all duration-500">{h}</span>
                    ))}
                </div>
            </div>

            {/* Avatar */}
            <ManagerAvatar name={m.name} initiale={m.initiale} color={m.color} avatar={m.avatar} />

            {/* Hover glow */}
            <div
                className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] opacity-0 group-hover:opacity-[0.08] transition-opacity duration-1000 pointer-events-none"
                style={{ backgroundColor: m.color }}
            />

            {/* Right separator */}
            <div className="absolute right-0 top-8 bottom-8 w-px bg-white/[0.04]" />
        </div>
    )
}

// ─── Neural Graph ──────────────────────────────────────────────────────────────
function GraphMockup() {
    // Center
    const cx = 500, cy = 340

    // Cluster halos
    const clusters = [
        { label: "Stratégie", x: 320, y: 175, rx: 90, ry: 65, color: "#7c3aed" },
        { label: "Finance", x: 680, y: 200, rx: 80, ry: 60, color: "#d97706" },
        { label: "Tech", x: 740, y: 380, rx: 85, ry: 60, color: "#059669" },
        { label: "Marché", x: 620, y: 510, rx: 90, ry: 60, color: "#2563eb" },
        { label: "Mémoire", x: 300, y: 470, rx: 80, ry: 55, color: "#db2777" },
        { label: "Vision", x: 180, y: 310, rx: 70, ry: 55, color: "#7c3aed" },
    ]

    // Named concept nodes
    const named = [
        { x: 280, y: 155, label: "Positionnement", r: 4.5, color: "#7c3aed" },
        { x: 340, y: 130, label: "Go-to-market", r: 4.0, color: "#7c3aed" },
        { x: 375, y: 190, label: "Avantage concurrentiel", r: 4.0, color: "#7c3aed" },
        { x: 670, y: 170, label: "Runway 18 mois", r: 4.5, color: "#d97706" },
        { x: 720, y: 215, label: "Unit economics", r: 4.0, color: "#d97706" },
        { x: 645, y: 225, label: "Pricing B2B", r: 4.0, color: "#d97706" },
        { x: 755, y: 345, label: "Tech Stack", r: 4.5, color: "#059669" },
        { x: 790, y: 400, label: "Infra IA", r: 4.0, color: "#059669" },
        { x: 740, y: 430, label: "API Design", r: 3.5, color: "#059669" },
        { x: 600, y: 500, label: "TAM Europe", r: 4.5, color: "#2563eb" },
        { x: 660, y: 535, label: "ICP défini", r: 4.0, color: "#2563eb" },
        { x: 575, y: 545, label: "Canaux acquisition", r: 3.5, color: "#2563eb" },
        { x: 285, y: 455, label: "Décisions clés", r: 4.5, color: "#db2777" },
        { x: 335, y: 500, label: "Briefs KAEL", r: 4.0, color: "#db2777" },
        { x: 260, y: 500, label: "Contexte projet", r: 3.5, color: "#db2777" },
        { x: 155, y: 295, label: "Mission", r: 4.5, color: "#a78bfa" },
        { x: 195, y: 340, label: "Valeurs", r: 4.0, color: "#a78bfa" },
        { x: 160, y: 345, label: "Impact", r: 3.5, color: "#a78bfa" },
        // Mid-ring
        { x: 440, y: 220, label: "MVP Scope", r: 5.0, color: "rgba(255,255,255,0.5)" },
        { x: 580, y: 290, label: "Roadmap Q3", r: 4.5, color: "rgba(255,255,255,0.45)" },
        { x: 580, y: 405, label: "GO Marché", r: 4.5, color: "rgba(255,255,255,0.45)" },
        { x: 430, y: 460, label: "Utilisateur cible", r: 5.0, color: "rgba(255,255,255,0.5)" },
        { x: 365, y: 370, label: "Fondateur", r: 5.5, color: "rgba(255,255,255,0.65)" },
        { x: 390, y: 265, label: "Vision Produit", r: 4.5, color: "rgba(255,255,255,0.45)" },
        // Telegram
        { x: 130, y: 430, label: "Telegram · Mobile", r: 6.0, color: "#2AABEE" },
    ]

    // Background neurons
    const neurons = [
        { x: 220, y: 220, r: 2, o: 0.18 }, { x: 255, y: 185, r: 1.5, o: 0.12 }, { x: 190, y: 250, r: 2, o: 0.15 },
        { x: 410, y: 160, r: 2, o: 0.14 }, { x: 465, y: 145, r: 1.5, o: 0.10 }, { x: 500, y: 170, r: 2, o: 0.13 },
        { x: 545, y: 155, r: 1.5, o: 0.11 }, { x: 590, y: 170, r: 2, o: 0.13 }, { x: 620, y: 145, r: 1.5, o: 0.10 },
        { x: 700, y: 270, r: 2, o: 0.14 }, { x: 740, y: 290, r: 1.5, o: 0.11 }, { x: 820, y: 320, r: 2, o: 0.12 },
        { x: 820, y: 460, r: 1.5, o: 0.10 }, { x: 780, y: 490, r: 2, o: 0.13 }, { x: 830, y: 370, r: 1.5, o: 0.09 },
        { x: 700, y: 560, r: 2, o: 0.14 }, { x: 630, y: 575, r: 1.5, o: 0.10 }, { x: 520, y: 580, r: 2, o: 0.13 },
        { x: 460, y: 570, r: 1.5, o: 0.11 }, { x: 380, y: 555, r: 2, o: 0.14 }, { x: 310, y: 545, r: 1.5, o: 0.10 },
        { x: 215, y: 520, r: 2, o: 0.13 }, { x: 185, y: 470, r: 1.5, o: 0.11 }, { x: 155, y: 400, r: 2, o: 0.14 },
        { x: 135, y: 350, r: 1.5, o: 0.10 }, { x: 145, y: 250, r: 2, o: 0.12 }, { x: 175, y: 200, r: 1.5, o: 0.10 },
        { x: 240, y: 155, r: 2, o: 0.13 }, { x: 310, y: 100, r: 1.5, o: 0.09 }, { x: 400, y: 95, r: 2, o: 0.11 },
        { x: 490, y: 90, r: 1.5, o: 0.09 }, { x: 570, y: 105, r: 2, o: 0.11 }, { x: 650, y: 120, r: 1.5, o: 0.09 },
        { x: 730, y: 145, r: 2, o: 0.11 }, { x: 800, y: 190, r: 1.5, o: 0.09 }, { x: 840, y: 255, r: 2, o: 0.10 },
        { x: 840, y: 560, r: 1.5, o: 0.09 }, { x: 115, y: 310, r: 2, o: 0.10 }, { x: 100, y: 480, r: 1.5, o: 0.09 },
    ]

    // Edges: [fromIdx, toIdx, opacity]
    const edges: [number, number, number][] = [
        [18, 19, 0.18], [18, 20, 0.16], [18, 21, 0.18], [18, 22, 0.25], [18, 23, 0.16],
        [18, 0, 0.12], [23, 1, 0.10], [23, 2, 0.12],
        [19, 3, 0.11], [19, 4, 0.10], [19, 5, 0.12],
        [19, 6, 0.13], [20, 7, 0.10], [20, 8, 0.10],
        [20, 9, 0.12], [20, 10, 0.10], [21, 11, 0.10],
        [21, 12, 0.12], [21, 13, 0.10], [22, 14, 0.09],
        [22, 15, 0.14], [22, 16, 0.11], [22, 17, 0.10],
        [0, 15, 0.06], [2, 23, 0.07], [3, 6, 0.06], [9, 10, 0.09], [12, 13, 0.08], [4, 5, 0.09],
        [1, 18, 0.10], [7, 8, 0.09], [11, 9, 0.09], [16, 17, 0.09], [14, 12, 0.08],
    ]

    // KAEL spokes
    const kaelEdges = [18, 19, 20, 21, 22, 23, 24]

    return (
        <div className="relative w-full overflow-hidden select-none" style={{ aspectRatio: "16/9", background: "rgba(0,0,0,0.78)" }}>
            {/* Dot grid */}
            <div className="absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
            }} />
            <svg viewBox="0 0 1000 680" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                    {clusters.map((c, i) => (
                        <radialGradient key={i} id={`halo${i}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={c.color} stopOpacity="0.11" />
                            <stop offset="100%" stopColor={c.color} stopOpacity="0" />
                        </radialGradient>
                    ))}
                    <radialGradient id="kaelGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="tgGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2AABEE" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2AABEE" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Cluster halos */}
                {clusters.map((c, i) => (
                    <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx * 1.9} ry={c.ry * 1.9} fill={`url(#halo${i})`} />
                ))}

                {/* KAEL central glow */}
                <ellipse cx={cx} cy={cy} rx="230" ry="200" fill="url(#kaelGlow)" />
                <ellipse cx={130} cy={430} rx="85" ry="75" fill="url(#tgGlow)" />

                {/* Pulse rings */}
                <circle cx={cx} cy={cy} r="55" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.13" />
                <circle cx={cx} cy={cy} r="115" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.08" />
                <circle cx={cx} cy={cy} r="195" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.05" />
                <circle cx={cx} cy={cy} r="295" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" opacity="0.03" />

                {/* Background neurons */}
                {neurons.map((n, i) => (
                    <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="white" opacity={n.o} />
                ))}
                {neurons.slice(0, 18).map((n, i) => {
                    const p = neurons[(i + 9) % neurons.length]
                    return <line key={`nb${i} `} x1={n.x} y1={n.y} x2={p.x} y2={p.y} stroke="white" strokeWidth="0.4" opacity="0.035" />
                })}

                {/* Named edges */}
                {edges.map(([fi, ti, op], i) => {
                    const f = named[fi], t = named[ti]
                    if (!f || !t) return null
                    return <line key={`e${i} `} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="white" strokeWidth="0.7" opacity={op} />
                })}

                {/* KAEL spokes */}
                {kaelEdges.map((ni, i) => {
                    const n = named[ni]
                    if (!n) return null
                    const isTg = ni === 24
                    return (
                        <line key={`ks${i} `}
                            x1={cx} y1={cy} x2={n.x} y2={n.y}
                            stroke={isTg ? "#2AABEE" : "hsl(var(--primary))"}
                            strokeWidth={isTg ? "0.9" : "0.8"}
                            opacity={isTg ? 0.28 : 0.16}
                            strokeDasharray={isTg ? "4 4" : undefined}
                        />
                    )
                })}

                {/* Named nodes */}
                {named.map((n, i) => {
                    const isTg = i === 24
                    return (
                        <g key={i}>
                            {isTg && <circle cx={n.x} cy={n.y} r={n.r + 7} fill="#2AABEE" opacity="0.08" />}
                            <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={isTg ? 0.9 : 0.72} />
                            <text x={n.x + n.r + 6} y={n.y + 1}
                                fontSize={isTg ? "9" : "7.5"}
                                fill={isTg ? "rgba(42,171,238,0.72)" : "rgba(255,255,255,0.33)"}
                                dominantBaseline="middle" fontFamily="monospace"
                            >{n.label}</text>
                        </g>
                    )
                })}

                {/* Cluster labels */}
                {clusters.map((c, i) => (
                    <text key={i} x={c.x} y={c.y - c.ry * 1.55}
                        fontSize="7" fill={c.color} opacity="0.38"
                        textAnchor="middle" fontFamily="monospace" letterSpacing="0.07em"
                    >{c.label.toUpperCase()}</text>
                ))}

                {/* KAEL center */}
                <circle cx={cx} cy={cy} r="30" fill="hsl(var(--primary))" opacity="0.07" />
                <circle cx={cx} cy={cy} r="19" fill="hsl(var(--primary))" opacity="0.11" />
                <circle cx={cx} cy={cy} r="11" fill="hsl(var(--primary))" />
                <text x={cx + 17} y={cy + 1} fontSize="12" fill="rgba(255,255,255,0.95)" dominantBaseline="middle" fontFamily="sans-serif" fontWeight="700">KAEL</text>

                {/* Crosshair */}
                <g opacity="0.10">
                    <line x1={cx - 22} y1={cy} x2={cx - 14} y2={cy} stroke="white" strokeWidth="1" />
                    <line x1={cx + 14} y1={cy} x2={cx + 22} y2={cy} stroke="white" strokeWidth="1" />
                    <line x1={cx} y1={cy - 22} x2={cx} y2={cy - 14} stroke="white" strokeWidth="1" />
                    <line x1={cx} y1={cy + 14} x2={cx} y2={cy + 22} stroke="white" strokeWidth="1" />
                </g>

                {/* Nav hint */}
                <text x="964" y="660" fontSize="6.5" fill="rgba(255,255,255,0.10)" textAnchor="end" fontFamily="monospace">scroll · zoom · navigate</text>
            </svg>
        </div>
    )
}


// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { isLoggedIn } = useAuth() // Called useAuth in the component
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [applicationStep, setApplicationStep] = useState(1)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        roleAndProject: "",
        projectUrl: "",
        urgency: 0,
        painPoints: "",
        alternativeAndCost: "",
        neededExpertise: "",
        selectedExpert: "",
        attraction: "",
        ambitionAndWhy: "",
        discovery: ""
    })

    // Auto-scroll ref based on current step
    const modalContentRef = useRef<HTMLDivElement>(null)

    // ... existing scroll logic ...= () => setIsModalOpen(true)
    const openModal = () => setIsModalOpen(true)
    const closeModal = () => {
        setIsModalOpen(false)
        // Reset after animation
        setTimeout(() => {
            setApplicationStep(1)
            setFormData({
                name: "",
                email: "",
                roleAndProject: "",
                projectUrl: "",
                urgency: 0, // Reset urgency
                painPoints: "",
                alternativeAndCost: "",
                neededExpertise: "",
                selectedExpert: "", // Reset selectedExpert
                attraction: "",
                ambitionAndWhy: "",
                discovery: ""
            })
        }, 300)
    }

    const nextStep = () => {
        setApplicationStep(prev => Math.min(prev + 1, 4))
        if (modalContentRef.current) {
            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = () => {
        setApplicationStep(prev => Math.max(prev - 1, 1))
        if (modalContentRef.current) {
            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleInputChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmitApplication = () => {
        console.log("Candidature soumise :", formData)
        alert("Votre candidature a été transmise.\n\n" + JSON.stringify(formData, null, 2))
        closeModal()
    } // Auto-scroll logic for Experts carousel
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        let animationFrameId: number
        let direction = 1 // 1 for right, -1 for left
        let delayTimer: NodeJS.Timeout

        const scroll = () => {
            if (!isHovered && el && window.innerWidth >= 768) {
                const speed = direction === 1 ? 0.5 : 1.2
                el.scrollLeft += (speed * direction)

                // Toggle direction when reaching boundaries
                if (direction === 1 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
                    direction = -1
                } else if (direction === -1 && el.scrollLeft <= 0) {
                    direction = 1
                }
            }
            animationFrameId = requestAnimationFrame(scroll)
        }

        // Wait 1.5s before starting the scroll
        delayTimer = setTimeout(() => {
            animationFrameId = requestAnimationFrame(scroll)
        }, 1500)

        return () => {
            clearTimeout(delayTimer)
            cancelAnimationFrame(animationFrameId)
        }
    }, [isHovered])

    return (
        <div className="min-h-screen bg-[#060608] text-foreground flex flex-col selection:bg-primary/20">

            {/* ─── Header — glass liquid pill ─────────────────────────── */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-between px-5 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gradient-to-b from-transparent via-primary/50 to-transparent pointer-events-none" />

                        <div className="flex items-center gap-8">
                            <Logo size="lg" />

                            {/* Desktop Nav */}
                            <nav className="hidden md:flex items-center gap-6">
                                {[
                                    { label: "Experts", href: "#experts" },
                                    { label: "Méthode", href: "#methode" },
                                    { label: "Vision", href: "#horizon" },
                                    { label: "Offre", href: "#offer" }
                                ].map((link) => (
                                    <a
                                        key={link.label}
                                        href={link.href}
                                        className="text-xs font-jakarta tracking-widest text-white/30 hover:text-white/80 uppercase transition-colors duration-200"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Desktop Actions */}
                            <nav className="hidden md:flex items-center gap-1">
                                {isLoggedIn ? (
                                    <Link
                                        href="/home"
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all duration-200 shadow-[0_2px_16px_rgba(255,255,255,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                        Accéder au workspace
                                        <span className="text-black/40 text-xs">→</span>
                                    </Link>
                                ) : (
                                    <>
                                        <a
                                            href="/auth/login"
                                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200">
                                            Log in
                                        </a>
                                        <button
                                            onClick={openModal}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all duration-200 shadow-[0_2px_16px_rgba(255,255,255,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                            Early Access
                                            <span className="text-black/40 text-xs">→</span>
                                        </button>
                                    </>
                                )}
                            </nav>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 text-white/40 hover:text-white transition-colors"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Overlay */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-full left-6 right-6 mt-2 md:hidden"
                            >
                                <div className="rounded-2xl border border-white/[0.08] bg-black/90 backdrop-blur-3xl p-6 shadow-2xl flex flex-col gap-6">
                                    <nav className="flex flex-col gap-4">
                                        {[
                                            { label: "Experts", href: "#experts" },
                                            { label: "Méthode", href: "#methode" },
                                            { label: "Vision", href: "#horizon" },
                                            { label: "Offre", href: "#offer" }
                                        ].map((link) => (
                                            <a
                                                key={link.label}
                                                href={link.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="text-sm font-jakarta tracking-widest text-white/50 hover:text-white uppercase transition-colors"
                                            >
                                                {link.label}
                                            </a>
                                        ))}
                                    </nav>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex flex-col gap-3">
                                        {isLoggedIn ? (
                                            <Link
                                                href="/home"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="w-full py-4 rounded-xl text-sm font-bold bg-white text-black text-center transition-all"
                                            >
                                                Accéder au workspace →
                                            </Link>
                                        ) : (
                                            <>
                                                <a
                                                    href="/auth/login"
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="w-full py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-all text-center"
                                                >
                                                    Log in
                                                </a>
                                                <button
                                                    onClick={() => { setIsMenuOpen(false); openModal(); }}
                                                    className="w-full py-4 rounded-xl text-sm font-bold bg-white text-black transition-all"
                                                >
                                                    Early Access
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* ─── Hero ───────────────────────────────────────────────── */}
            <section className="relative min-h-[96vh] w-full flex flex-col items-center justify-center overflow-hidden bg-[#000000] pt-32 pb-24">
                {/* Ambient Experts Orbs (Subtle reminders of the 7 poles) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Primary KAEL glow */}
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[70px] md:blur-[150px] rounded-full" />

                    {/* Stratégie (AXEL - Purple) */}
                    <div className="hidden md:block absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-[#7c3aed]/10 blur-[100px] rounded-full animate-[float1_15s_ease-in-out_infinite]" />
                    {/* Tech (KAI - Green) */}
                    <div className="hidden md:block absolute top-[25%] right-[25%] w-[250px] h-[250px] bg-[#059669]/10 blur-[100px] rounded-full animate-[float2_18s_ease-in-out_infinite_2s]" />
                    {/* Marketing (SKY - Pink) */}
                    <div className="hidden md:block absolute top-[40%] left-[10%] w-[350px] h-[350px] bg-[#db2777]/8 blur-[120px] rounded-full animate-[float3_20s_ease-in-out_infinite_5s]" />
                    {/* Finance (ELENA - Amber) */}
                    <div className="hidden md:block absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-[#d97706]/8 blur-[130px] rounded-full animate-[float1_25s_ease-in-out_infinite_1s]" />
                    {/* Market (MAYA - Blue) */}
                    <div className="hidden md:block absolute top-[15%] right-[40%] w-[200px] h-[200px] bg-[#2563eb]/10 blur-[90px] rounded-full animate-[float2_12s_ease-in-out_infinite_3s]" />
                </div>

                {/* Perspective grid floor */}
                <div className="absolute bottom-0 left-0 right-0 h-[55vh] bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" style={{ transform: 'perspective(1000px) rotateX(60deg) translateY(80px) scale(3)' }} />

                <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto gap-8 mt-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur text-white/70 text-xs font-medium tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-70"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </span>
                        Votre équipe de direction. Disponible dès maintenant.
                    </div>

                    {/* Headline */}
                    <h1 className="text-[clamp(3.3rem,8vw,6.5rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-[1.02] pb-2 text-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/60">Ne restez plus seul</span>
                        <br />
                        <span className="font-serif italic font-light text-primary/90">avec vos idées.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg sm:text-xl text-white/50 max-w-2xl leading-relaxed font-light tracking-wide text-center max-sm:max-w-[340px] mx-auto">
                        De l'idée au lancement. <strong className="text-white/90 font-medium">Sans équipe. Sans agence. Sans attendre.</strong><br />
                        Confiez votre vision à un comité de direction expert, piloté par KAEL.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 mt-6">
                        {isLoggedIn ? (
                            <Link href="/home" className="group relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-violet-500/50 to-primary/50 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-700" />
                                <button className="relative h-14 px-10 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(255,255,255,0.1)] overflow-hidden flex items-center gap-3">
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative">Continuer dans le workspace</span>
                                    <svg className="w-4 h-4 text-black/50 group-hover:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={openModal}
                                    className="group relative h-14 px-10 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(255,255,255,0.1)] overflow-hidden flex items-center gap-3"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative">Démarrer avec KAEL</span>
                                    <svg className="w-4 h-4 text-black/50 group-hover:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                                <div className="flex items-center gap-3 text-sm text-white/25">
                                    <div className="w-px h-7 bg-white/10 hidden sm:block" />
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <span>Accès beta réservé aux fondateurs</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── Workspace & Graph Preview ───────────────────────────── */}
            <section className="relative w-full max-w-[1400px] mx-auto px-6 z-20 pt-16 pb-24">
                {/* Section header */}
                <div className="mb-16">
                    <p className="text-[10px] font-jakarta tracking-[0.3em] text-primary/50 uppercase mb-5">Workspace & Experts</p>
                    <div className="flex items-end justify-between gap-8">
                        <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                            Une conscience.<br />
                            <span className="font-serif italic font-light text-white/50">partagée.</span>
                        </h2>
                        <p className="max-w-xs text-sm text-white/30 leading-relaxed hidden lg:block">
                            Orchestrez votre projet avec KAEL et une équipe de 7 experts spécialisés, depuis un point d'accès unique.
                        </p>
                    </div>
                </div>

                {/* App window frame */}
                <div className="rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-xl md:backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] md:shadow-[0_0_120px_rgba(0,0,0,0.95),0_0_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden">
                    {/* Toolbar — minimal */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
                            <span className="text-[9px] font-jakarta text-white/20 uppercase tracking-widest">Live</span>
                        </div>
                    </div>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
                        {/* Graph */}
                        <div className="hidden lg:block relative border-r border-white/[0.04]">
                            <GraphMockup />
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        </div>

                        {/* Right panel — two editorial blocks */}
                        <div className="flex flex-col justify-between p-8 gap-10">
                            {/* Block 1 — Telegram */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <svg className="w-4 h-4 text-[#2AABEE]/70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.04 9.609c-.149.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.612z" /></svg>
                                    <span className="text-[9px] font-jakarta text-[#2AABEE]/50 uppercase tracking-widest">Telegram</span>
                                </div>
                                <p className="text-3xl font-jakarta font-extrabold tracking-[-0.03em] text-white/80 leading-tight mb-2">
                                    Pilotez.
                                </p>
                                <p className="text-3xl font-jakarta  font-light text-white/25 leading-tight mb-5">
                                    depuis votre iPhone.
                                </p>
                                <p className="text-sm text-white/30 leading-relaxed">
                                    Briefez KAEL, validez une décision, suivez l'avancement — sans ouvrir un ordinateur.
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/[0.05]" />

                            {/* Block 2 — Memory */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                                    <span className="text-[9px] font-jakarta text-violet-400/40 uppercase tracking-widest">Decision Memory</span>
                                </div>
                                <p className="text-3xl font-jakarta font-extrabold tracking-[-0.03em] text-white/80 leading-tight mb-2">
                                    Mémorise.
                                </p>
                                <p className="text-3xl font-jakarta  font-light text-white/25 leading-tight mb-5">
                                    toujours.
                                </p>
                                <p className="text-sm text-white/30 leading-relaxed">
                                    Chaque brief, chaque décision s'accumule. KAEL ne repart jamais de zéro.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── 7 Pôles — horizontal scroll ─── juste après graph ── */}
            <section id="experts" className="border-y border-white/[0.04] overflow-hidden relative">

                {/* Section header for Experts */}
                <div className="max-w-[1400px] mx-auto px-6 pt-24 pb-12 relative z-20">
                    <p className="text-[10px] font-jakarta tracking-[0.3em] text-primary/50 uppercase mb-5">Équipe de Direction</p>
                    <div className="flex items-end justify-between gap-8">
                        <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                            7 experts d'élite.<br />
                            <span className="font-serif italic font-light text-white/50">à vos ordres.</span>
                        </h2>
                        <p className="max-w-xs text-sm text-white/30 leading-relaxed hidden lg:block">
                            Chaque pôle stratégique de votre entreprise est piloté par un agent spécialisé, autonome et interconnecté.
                        </p>
                    </div>
                </div>

                {/* Horizontal Scroll Area */}
                <div className="relative h-auto sm:h-[720px] max-w-[1400px] mx-auto px-6 w-full">
                    {/* Subtle radial depth */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(120,119,198,0.03),transparent)] pointer-events-none" />

                    <div className="flex flex-col sm:flex-row relative h-full">
                        <div className="shrink-0 w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-white/[0.04] flex flex-col h-[600px] sm:h-[720px] sm:sticky sm:left-0 z-10 bg-[#030304]/95 backdrop-blur-sm overflow-hidden">
                            {/* Text block — same typography as ManagerCard */}
                            <div className="flex flex-col px-6 sm:px-8 pt-4 pb-0 shrink-0">
                                {/* Code + dot */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-jakarta tracking-wider text-white/25 uppercase">IA</span>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                    </span>
                                </div>

                                {/* Name — hero bold style */}
                                <div className="mb-0 leading-none">
                                    <span className="block text-[2.2rem] sm:text-[2.6rem] font-jakarta font-extrabold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/50">
                                        KAEL.
                                    </span>
                                </div>

                                {/* Title */}
                                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] mb-2 text-primary/80">Chief of Staff · IA</p>

                                {/* Tagline — hero serif  style */}
                                <div className="mb-2">
                                    <p className="text-xl font-jakarta font-extrabold tracking-[-0.03em] text-white/75 leading-tight">
                                        Décide.
                                    </p>
                                    <p className="text-xl font-serif italic text-white/50 leading-tight">
                                        délègue.
                                    </p>
                                </div>

                                {/* Total économisé */}
                                <div className="mb-3">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xl font-jakarta font-extrabold tracking-tight text-primary">
                                            770 000 €
                                        </span>
                                        <span className="text-[9px] font-jakarta text-white/25 uppercase tracking-wider">/an évités</span>
                                    </div>
                                    <p className="text-[9px] text-white/25 font-jakarta mt-0.5">7 postes cadres · marché FR 2024</p>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {['CEO', 'Stratégie', 'Décision'].map((h) => (
                                        <span key={h} className="text-[8px] font-jakarta text-white/25 border border-white/[0.05] px-2.5 py-1 rounded-full uppercase tracking-wider">{h}</span>
                                    ))}
                                </div>
                            </div>

                            {/* KAEL portrait — flex-1 same as ManagerAvatar */}
                            <div className="relative w-full flex-1 min-h-0 mt-auto group">
                                {/* Animated particle cloud */}
                                <div className="hidden sm:block absolute inset-0 pointer-events-none overflow-hidden">
                                    <div className="absolute w-32 h-32 rounded-full blur-[60px] opacity-[0.15] animate-[float1_8s_ease-in-out_infinite]" style={{ backgroundColor: 'hsl(var(--primary))', left: '20%', bottom: '30%' }} />
                                    <div className="absolute w-24 h-24 rounded-full blur-[50px] opacity-[0.10] animate-[float2_10s_ease-in-out_infinite_1s]" style={{ backgroundColor: 'hsl(var(--primary))', right: '15%', bottom: '20%' }} />
                                    <div className="absolute w-20 h-20 rounded-full blur-[40px] opacity-[0.12] animate-[float3_7s_ease-in-out_infinite_2s]" style={{ backgroundColor: 'hsl(var(--primary))', left: '50%', bottom: '50%' }} />
                                </div>
                                {/* CTA block — absolute on desktop to NOT push the image up */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 pt-0 z-20 sm:pointer-events-none">
                                    <button
                                        onClick={openModal}
                                        className="group/btn relative w-full h-12 flex sm:hidden items-center justify-between px-6 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 sm:pointer-events-auto"
                                    >
                                        <span className="text-[11px] font-jakarta font-bold text-white/90 tracking-wider">SOUMETTRE MON DOSSIER</span>
                                        <svg className="w-4 h-4 text-white/40 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </div>
                                <img
                                    src="/images/experts/Kael.svg"
                                    alt="KAEL"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="sync"
                                    className="relative z-10 w-full h-full object-contain object-bottom transition-transform duration-700 hover:scale-[1.03] origin-bottom"
                                />
                            </div>
                        </div>

                        {/* Expert Cards — fluid transition with premium desktop fade */}
                        <div
                            ref={scrollRef}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="flex flex-col sm:flex-row overflow-y-visible sm:overflow-x-auto pb-32 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:[mask-image:linear-gradient(to_right,black_90%,transparent)]"
                        >
                            {MANAGERS.map((m) => (
                                <div key={m.code} className="shrink-0 w-full sm:w-auto">
                                    <ManagerCard m={m} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Comment ça marche — editorial premium ───────────────── */}
            <section id="methode" className="relative py-32 px-6 overflow-hidden">
                {/* Ambient */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-900/[0.06] blur-[60px] md:blur-[140px] rounded-full pointer-events-none" />
                <div className="max-w-[1400px] mx-auto w-full">
                    {/* Section header */}
                    <div className="mb-20">
                        <p className="text-[10px] font-jakarta tracking-[0.3em] text-primary/50 uppercase mb-5">Protocole</p>
                        <div className="flex items-end justify-between gap-8">
                            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                                De l'idée.<br />
                                <span className="font-serif italic font-light text-white/50">au marché.</span>
                            </h2>
                            <p className="max-w-xs text-sm text-white/30 leading-relaxed hidden lg:block">
                                Du premier brief jusqu'au lancement — sans recruter, sans agence, sans attendre.
                            </p>
                        </div>
                    </div>

                    {/* Steps — bold numbered cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
                        {STEPS.map((s, i) => (
                            <div key={s.n} className="relative bg-[#060608] p-10 flex flex-col gap-6 group hover:bg-white/[0.02] transition-all duration-500 overflow-hidden">
                                {/* Huge number background */}
                                <span className="absolute -right-4 -top-4 text-[10rem] font-jakarta font-black text-white/[0.02] leading-none select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700">
                                    {s.n}
                                </span>
                                {/* Accent line */}
                                <div className="w-8 h-[2px] bg-primary/50 group-hover:w-16 group-hover:bg-primary transition-all duration-500" />
                                <div>
                                    <p className="text-[9px] font-jakarta tracking-[0.3em] text-white/20 uppercase mb-4">Phase {s.n}</p>
                                    <h3 className="text-2xl font-jakarta font-extrabold tracking-[-0.03em] text-white/85 group-hover:text-white transition-colors duration-500 mb-4 leading-tight">{s.title}.</h3>
                                    <p className="text-sm leading-relaxed text-white/30 group-hover:text-white/45 transition-colors duration-500">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Horizon — premium feature cards ────────────────────── */}
            <section id="horizon" className="relative py-32 px-6 overflow-hidden border-t border-white/[0.04]">
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-primary/[0.04] blur-[60px] md:blur-[160px] rounded-full pointer-events-none" />
                <div className="max-w-[1400px] mx-auto w-full">
                    {/* Header */}
                    <div className="mb-20 max-w-xl">
                        <p className="text-[10px] font-jakarta tracking-[0.3em] text-primary/50 uppercase mb-5">Horizon</p>
                        <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-none mb-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">Au-delà</span><br />
                            <span className="font-serif italic font-light text-white/50">de l'idée.</span>
                        </h2>
                        <p className="text-white/35 leading-relaxed text-sm max-w-sm">
                            k3rn.labs est un écosystème ouvert — les projets se structurent, se financent, trouvent leurs collaborateurs.
                        </p>
                    </div>

                    {/* Feature cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                n: "01",
                                title: "Financement\ncommunautaire",
                                tagline: "Lever.",
                                tagline2: "sans intermédiaire.",
                                desc: "Présentez votre projet à la communauté k3rn. Recevez des pledges, validez votre marché, levez les premiers fonds.",
                                status: "Bientôt",
                                active: false,
                                color: "#7c3aed",
                            },
                            {
                                n: "02",
                                title: "Collaboration\ninter-projets",
                                tagline: "Connecter.",
                                tagline2: "co-construire.",
                                desc: "Trouvez des co-fondateurs, des freelances, des premiers clients dans l'écosystème k3rn.",
                                status: "Bientôt",
                                active: false,
                                color: "#2563eb",
                            },
                            {
                                n: "03",
                                title: "Lancement\n& optimisation",
                                tagline: "Scaler.",
                                tagline2: "sans limite.",
                                desc: "Vos 7 pôles restent actifs — pour ajuster la stratégie, challenger les hypothèses et scaler.",
                                status: "Disponible maintenant",
                                active: true,
                                color: "#059669",
                            },
                        ].map((item) => (
                            <div key={item.n} className="relative border border-white/[0.06] rounded-2xl p-8 flex flex-col gap-5 group hover:border-white/[0.12] transition-all duration-500 overflow-hidden bg-[#060608]">
                                {/* Top accent */}
                                <div className="absolute top-0 left-8 right-8 h-px" style={{ background: `linear-gradient(to right, transparent, ${item.color}60, transparent)` }} />
                                {/* Glow on hover */}
                                <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-[0.12] transition-opacity duration-700" style={{ backgroundColor: item.color }} />

                                <div className="flex items-start justify-between">
                                    <span className="text-[9px] font-jakarta tracking-[0.3em] text-white/20 uppercase">Horizon {item.n}</span>
                                    <span className={`text-[8px] font-jakarta tracking-widest uppercase px-2.5 py-1 rounded-full border ${item.active ? 'text-emerald-400/70 border-emerald-400/20 bg-emerald-400/[0.06]' : 'text-white/20 border-white/[0.06]'}`}>
                                        {item.status}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-jakarta font-extrabold tracking-[-0.03em] text-white/80 group-hover:text-white transition-colors duration-500 whitespace-pre-line leading-tight mb-1">
                                        {item.tagline}
                                    </h3>
                                    <p className="text-2xl font-jakarta  font-light text-white/25 group-hover:text-white/40 transition-colors duration-500 leading-tight">
                                        {item.tagline2}
                                    </p>
                                </div>

                                <p className="text-sm text-white/30 leading-relaxed group-hover:text-white/45 transition-colors duration-500 flex-1">{item.desc}</p>

                                <div className="w-6 h-[1.5px] group-hover:w-12 transition-all duration-500" style={{ backgroundColor: item.color }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Alpha Offer / Pricing ────────────────────────────────── */}
            <section id="offer" className="relative py-32 px-6 overflow-hidden border-t border-white/[0.04] bg-[#030304]">
                {/* Ambient Depth */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-primary/[0.03] blur-[60px] md:blur-[140px] rounded-full pointer-events-none" />

                <div className="max-w-[1200px] mx-auto w-full relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-16">

                        {/* Left: Text & Value Prop */}
                        <div className="lg:w-1/2 max-w-xl">
                            <p className="text-[10px] font-jakarta tracking-[0.3em] text-emerald-400 uppercase mb-5 flex items-center gap-3">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                Programme Alpha Ouvert
                            </p>
                            <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-[1.05] mb-6">
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/60">Une équipe de 7.</span><br />
                                <span className="font-serif italic font-light text-primary/90">Pour le prix de zéro.</span>
                            </h2>
                            <p className="text-lg text-white/40 leading-relaxed mb-10 font-light">
                                k3rn.labs est actuellement en bêta fermée. Nous sélectionnons une poignée de fondateurs visionnaires pour affiner l'alliance entre IA et décision stratégique. <strong className="text-white/90 font-medium">Aucun frais d'agence. Aucun salaire à verser.</strong>
                            </p>

                            <ul className="flex flex-col gap-4 text-sm text-white/50">
                                <li className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-primary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Accès complet aux 7 Pôles Experts
                                </li>
                                <li className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-primary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Coordination centralisée par KAEL
                                </li>
                                <li className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-primary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Mémoire décisionnelle persistante
                                </li>
                            </ul>
                        </div>

                        {/* Right: The Pricing Card */}
                        <div className="lg:w-5/12 w-full shrink-0">
                            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-10 overflow-hidden group">
                                {/* Card ambient hover effect */}
                                <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h3 className="text-2xl font-jakarta font-bold text-white mb-2">Licence Alpha</h3>
                                            <p className="text-sm text-white/40">Freemium limité pendant la bêta</p>
                                        </div>
                                        <div className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] font-jakarta text-white/40 uppercase tracking-widest">
                                            Sur sélection
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-2 mb-8">
                                        <span className="text-5xl font-jakarta font-black tracking-tight text-white">0€</span>
                                        <span className="text-sm font-jakarta text-white/30 tracking-widest uppercase">/ mois</span>
                                    </div>

                                    <div className="mb-10 w-full p-4 rounded-xl border border-primary/20 bg-primary/[0.03] flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white/90 mb-1">30 missions incluses</p>
                                            <p className="text-[11px] text-white/40 leading-relaxed">Une mission équivaut à un brief stratégique abouti, traité par un expert ciblé sous la supervision de KAEL.</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={openModal}
                                        className="w-full h-14 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(255,255,255,0.1)] overflow-hidden flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        <span className="relative">Soumettre ma candidature</span>
                                        <svg className="w-4 h-4 text-black/50 group-hover/btn:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                    <p className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-wider font-jakarta">
                                        Places restreintes. Accès non garanti.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
            <section className="relative py-40 px-6 text-center overflow-hidden border-t border-white/[0.04]">
                {/* Ambient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.05] to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/[0.08] blur-[80px] md:blur-[180px] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 left-[30%] -translate-y-1/2 w-[300px] h-[300px] bg-violet-600/[0.06] blur-[60px] md:blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-[900px] mx-auto">
                    <p className="text-[10px] font-jakarta tracking-[0.3em] text-primary/50 uppercase mb-10">Rejoignez k3rn.labs</p>

                    <h2 className="text-[clamp(3rem,7vw,6rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-[1.0] mb-12">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/40">Votre idée mérite</span><br />
                        <span className="font-serif italic font-light text-white/50">une vraie équipe.</span>
                    </h2>

                    <p className="text-white/30 mb-14 max-w-sm mx-auto leading-relaxed text-sm">
                        Rejoignez les fondateurs qui construisent avec k3rn.labs — seuls, mais armés comme une multinationale.
                    </p>

                    <div className="group relative inline-flex">
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/40 via-violet-500/40 to-primary/40 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-700" />
                        <button
                            onClick={openModal}
                            className="relative h-16 px-14 rounded-xl text-sm font-bold tracking-[0.1em] uppercase bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_40px_rgba(255,255,255,0.15)] flex items-center gap-4">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative">Démarrer avec KAEL</span>
                            <svg className="w-4 h-4 text-black/40 group-hover:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-6 text-[9px] font-jakarta tracking-[0.2em] text-white/15 uppercase">
                        <span>Accès beta gratuit</span>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span>7 Pôles experts</span>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span>KAEL inclus</span>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span>770 000€/an économisés</span>
                    </div>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="border-t border-white/[0.06] pb-28 md:pb-12">
                <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <Logo size="lg" />
                    <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase">
                        KAEL · OpenAI · GPT-4o · Supabase · pgvector

                    </p>
                    <div className="flex gap-8 text-[10px] font-jakarta tracking-widest text-white/20 uppercase">
                        <span className="cursor-pointer hover:text-white/50 transition-colors">CGU</span>
                        <span className="cursor-pointer hover:text-white/50 transition-colors">Privacy</span>
                    </div>
                </div>
            </footer>

            {/* ─── Sticky CTA Modal (Bottom Right) ─────────────────────── */}
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-1000 fill-mode-both max-sm:scale-95 origin-bottom-right hidden sm:flex">
                {isLoggedIn ? (
                    /* Logged-in: Ambassador / Affiliate access */
                    <Link href="/settings?tab=ambassador" className="group/modal block text-left">
                        <div className="relative flex items-center gap-3 sm:gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-3 pr-4 sm:p-4 sm:pr-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:-translate-y-1 max-sm:scale-95 origin-bottom-right">
                            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-600/10 opacity-0 group-hover/modal:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent opacity-0 group-hover/modal:opacity-100 transition-opacity duration-700" />
                            {/* NOVA Avatar */}
                            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/[0.2] bg-emerald-950/40">
                                <img src="/images/experts/Nova.webp" alt="NOVA" className="relative z-10 w-full h-full object-cover object-[center_20%] opacity-90 group-hover/modal:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex flex-col justify-center relative z-10 ml-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-sm sm:text-base font-jakarta font-bold text-white">Programme</span>
                                    <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit border border-emerald-500/20 bg-emerald-500/10 text-[8px] sm:text-[9px] font-jakarta text-emerald-400 uppercase tracking-widest">
                                        Ambassadeur
                                    </div>
                                </div>
                                <div className="w-full h-9 sm:h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-[12px] sm:text-sm tracking-tight flex items-center justify-center gap-2 px-3 sm:px-4 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.4)]">
                                    <span>Transmettre une invitation</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 group-hover/modal:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </div>
                        </div>
                    </Link>
                ) : (
                    /* Not logged-in: candidature flow */
                    <div onClick={openModal} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } }} className="group/modal block text-left outline-none">
                        <div className="relative flex items-center gap-3 sm:gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-3 pr-4 sm:p-4 sm:pr-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:-translate-y-1 max-sm:scale-95 origin-bottom-right">
                            <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-violet-600/10 opacity-0 group-hover/modal:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover/modal:opacity-100 transition-opacity duration-700" />
                            {/* KAEL Avatar */}
                            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shrink-0 border border-white/[0.05] bg-black/40">
                                <img src="/images/experts/Kael.webp" alt="KAEL" className="relative z-10 w-full h-full object-cover object-[center_20%] opacity-90 group-hover/modal:opacity-100 transition-opacity" />
                            </div>
                            {/* Content & CTA */}
                            <div className="flex flex-col justify-center relative z-10 ml-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-sm sm:text-base font-jakarta font-bold text-white">Licence Alpha</span>
                                    <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded w-fit border border-white/[0.06] bg-white/[0.03] text-[8px] sm:text-[9px] font-jakarta text-white/40 uppercase tracking-widest">
                                        Sur sélection
                                    </div>
                                </div>
                                <button
                                    onClick={openModal}
                                    className="group relative w-full h-11 sm:h-14 rounded-xl bg-white text-black font-bold text-[12px] sm:text-sm tracking-tight hover:bg-white/92 transition-all shadow-[0_8px_24px_-8px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
                                    <span>Soumettre mon dossier</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/40 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Application Modal ─────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Dark overlay without colors */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={closeModal}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                        {/* Colored orbs localized behind the modal blur */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.15] blur-[60px] md:blur-[100px] rounded-full animate-[float1_15s_ease-in-out_infinite] pointer-events-none" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/[0.1] blur-[50px] md:blur-[80px] rounded-full animate-[float2_18s_ease-in-out_infinite] pointer-events-none" />

                        <div ref={modalContentRef} className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-10 overflow-hidden group/modal">
                            {/* Card ambient hover effect (Licence Alpha style) */}
                            <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-violet-600/10 opacity-0 group-hover/modal:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 ring-4 ring-primary/5">
                                                <img src="/images/experts/Kael.webp" alt="Kael" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#050505] rounded-full" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-jakarta font-bold text-white leading-none mb-1">Kael</h3>
                                            <p className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest">Architecte Cognitif</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] font-jakarta text-white/40 hover:text-white uppercase tracking-widest flex items-center justify-center transition-colors mt-2"
                                    >
                                        <span className="sr-only">Fermer</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <div className="inline-block bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-none px-4 py-3 max-w-[90%]">
                                        <p className="text-sm text-white/80 leading-relaxed">
                                            {applicationStep === 1 && "Bonjour ! Je suis Kael. Je vais vous accompagner pour votre candidature. Commençons par faire connaissance..."}
                                            {applicationStep === 2 && "D'accord. Parlons du projet. Quelle est l'urgence pour vous et qu'est-ce qui vous freine le plus ?"}
                                            {applicationStep === 3 && "Je vois. Parmi nos experts, qui serait votre premier choix pour débloquer la situation ?"}
                                            {applicationStep === 4 && "Presque fini ! Pourquoi devrions-nous parier sur vous, et comment nous avez-vous connus ?"}
                                        </p>
                                    </div>
                                </div>

                                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                    {/* Helper Components */}
                                    {/* Smart Chips */}
                                    {false && (
                                        <div className="flex flex-wrap gap-2">
                                            {['CEO', 'Foundatrice', 'Solo-preneur', 'Product'].map((label) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => handleInputChange('roleAndProject', label)}
                                                    className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* STEP 1: Le Fondateur & Le Projet */}
                                    {applicationStep === 1 && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-2 font-medium">Nom</label>
                                                    <input
                                                        type="text"
                                                        value={formData.name}
                                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                                        placeholder="Léna Dupond"
                                                        className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-2 font-medium">E-mail</label>
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                                        placeholder="lena@gmail.com"
                                                        className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-3 font-medium">Votre rôle principal</label>
                                                <div className="flex flex-wrap gap-2 mb-3 max-w-[420px]">
                                                    {['CEO', 'CTO / Dev', 'Designer', 'Solopreneur', 'Serial Founder'].map((role) => (
                                                        <button
                                                            key={role}
                                                            type="button"
                                                            onClick={() => handleInputChange('roleAndProject', role)}
                                                            className={`px-4 py-2 rounded-full border text-[11px] transition-all whitespace-nowrap ${formData.roleAndProject === role
                                                                ? 'border-primary/50 bg-primary/10 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                                                                }`}
                                                        >
                                                            {role}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.roleAndProject}
                                                    onChange={(e) => handleInputChange('roleAndProject', e.target.value)}
                                                    placeholder="Ou précisez ici..."
                                                    className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20"
                                                />
                                            </div>

                                            <button
                                                className="w-full h-14 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group/btn relative overflow-hidden mt-4"
                                                onClick={nextStep}
                                                disabled={!formData.name || !formData.email || !formData.roleAndProject}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                <span className="relative">Continuer l'échange</span>
                                                <svg className="w-4 h-4 text-black/50 group-hover/btn:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 2: L'Urgence & La Douleur */}
                                    {applicationStep === 2 && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-4 font-medium leading-relaxed">
                                                    Quelle est l'urgence de votre projet ? (1 = Exploratoire, 5 = Lancement immédiat)
                                                </label>
                                                <div className="flex justify-between gap-2 mb-2">
                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => handleInputChange('urgency', val)}
                                                            className={`flex-1 h-12 rounded-xl border text-sm font-bold transition-all ${formData.urgency === val
                                                                ? 'border-primary/50 bg-primary/20 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white'
                                                                }`}
                                                        >
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-3 font-medium leading-relaxed">
                                                    Qu'est-ce qui vous freine le plus ?
                                                </label>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {['Développement Produit', 'Design / UX', 'Acquisition Clients', 'Recrutement Tech', 'Financement'].map((pain) => (
                                                        <button
                                                            key={pain}
                                                            type="button"
                                                            onClick={() => handleInputChange('painPoints', pain)}
                                                            className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${formData.painPoints === pain
                                                                ? 'border-primary/50 bg-primary/10 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                                                                }`}
                                                        >
                                                            {pain}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={formData.painPoints}
                                                    onChange={(e) => handleInputChange('painPoints', e.target.value)}
                                                    placeholder="Détaillez votre besoin ici..."
                                                    className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20 resize-none"
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    className="w-14 shrink-0 h-14 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all group/back"
                                                    onClick={prevStep}
                                                >
                                                    <svg className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                                </button>
                                                <button
                                                    className="flex-1 h-14 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                                                    onClick={nextStep}
                                                    disabled={!formData.painPoints || formData.urgency === 0}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                    <span className="relative">Continuer</span>
                                                    <svg className="w-4 h-4 text-black/50 group-hover/btn:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: L'Expert & L'Attraction */}
                                    {applicationStep === 3 && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-3 font-medium leading-relaxed">
                                                    Qui est votre premier choix parmi nos experts ?
                                                </label>
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    {['Marcus (Tech)', 'Nova (Design)', 'Kai (Cognitif)', 'Elena (Stratégie)'].map((expert) => (
                                                        <button
                                                            key={expert}
                                                            type="button"
                                                            onClick={() => handleInputChange('selectedExpert', expert)}
                                                            className={`px-4 py-3 rounded-xl border text-[11px] text-left transition-all ${formData.selectedExpert === expert
                                                                ? 'border-primary/50 bg-primary/10 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {expert}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-3 font-medium leading-relaxed">
                                                    Qu'est-ce qui vous donne le plus envie de nous rejoindre ?
                                                </label>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {['Vision CTO as a Service', 'Équipe complète 7-en-1', 'Accélération Radical', 'Expertise IA'].map((choice) => (
                                                        <button
                                                            key={choice}
                                                            type="button"
                                                            onClick={() => handleInputChange('attraction', choice)}
                                                            className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${formData.attraction === choice
                                                                ? 'border-primary/50 bg-primary/10 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                                                                }`}
                                                        >
                                                            {choice}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={formData.attraction}
                                                    onChange={(e) => handleInputChange('attraction', e.target.value)}
                                                    placeholder="Pourquoi nous ?"
                                                    className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20 resize-none"
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    className="w-14 shrink-0 h-14 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all group/back"
                                                    onClick={prevStep}
                                                >
                                                    <svg className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                                </button>
                                                <button
                                                    className="flex-1 h-14 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                                                    onClick={nextStep}
                                                    disabled={!formData.selectedExpert || !formData.attraction}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                    <span className="relative">Continuer</span>
                                                    <svg className="w-4 h-4 text-black/50 group-hover/btn:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: Ambition & Source */}
                                    {applicationStep === 4 && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-3 font-medium leading-relaxed">
                                                    Comment nous avez-vous connus ?
                                                </label>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {['LinkedIn', 'Twitter / X', 'Recommandation', 'Product Hunt', 'Google'].map((src) => (
                                                        <button
                                                            key={src}
                                                            type="button"
                                                            onClick={() => handleInputChange('discovery', src)}
                                                            className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${formData.discovery === src
                                                                ? 'border-primary/50 bg-primary/10 text-white'
                                                                : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                                                                }`}
                                                        >
                                                            {src}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-jakarta text-white/40 uppercase tracking-widest block mb-2 font-medium leading-relaxed">
                                                    Parlez-moi de votre ambition...
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={formData.ambitionAndWhy}
                                                    onChange={(e) => handleInputChange('ambitionAndWhy', e.target.value)}
                                                    placeholder="Pourquoi devrions-nous parier sur vous ?"
                                                    className="w-full bg-transparent border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.02] transition-colors placeholder:text-white/20 resize-none"
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    className="w-14 shrink-0 h-14 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all group/back"
                                                    onClick={prevStep}
                                                >
                                                    <svg className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                                </button>
                                                <button
                                                    className="flex-1 h-14 rounded-xl text-sm font-semibold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                                                    onClick={handleSubmitApplication}
                                                    disabled={!formData.ambitionAndWhy || !formData.discovery}
                                                >
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                    <span className="relative">Soumettre mon profil</span>
                                                    <svg className="w-4 h-4 text-white group-hover/btn:translate-y-[-2px] transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Indicators */}
                                    <div className="flex justify-center gap-2 pt-2">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-1 rounded-full transition-all duration-300 ${applicationStep === step ? 'w-6 bg-white' : applicationStep > step ? 'w-2 bg-white/40' : 'w-2 bg-white/10'}`}
                                            />
                                        ))}
                                    </div>

                                    <p className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-wider font-jakarta">
                                        Places restreintes. Accès non garanti.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
