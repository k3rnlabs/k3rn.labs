import { callLLM, type LLMMessage } from "./llm"

// ─── triggerDocumentExtraction ────────────────────────────────────────────────
// Fire-and-forget: analyse les derniers messages d'une session pôle et extrait
// un ExpertDocument si un livrable structuré est détecté.
export async function triggerDocumentExtraction(
  dossierId: string,
  poleCode: string,
  managerName: string,
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    // Ne traiter que les messages manager (non vides, non courts)
    const managerMessages = messages
      .filter((m) => m.role === "manager" && m.content.length > 200)
      .slice(-3) // Les 3 derniers messages manager
    if (managerMessages.length === 0) return

    const messagesText = managerMessages.map((m) => m.content).join("\n\n---\n\n")

    const { content } = await callLLM([
      {
        role: "system",
        content: `Tu es un extracteur de livrables experts. Analyse les messages ci-dessous d'un expert (${managerName}, pôle ${poleCode}).
Détermine s'ils contiennent un livrable structuré (analyse, rapport, recommandations techniques, projections, recherche).
Si oui, extrait-le en JSON canonique. Si non, retourne { "hasDocument": false }.

Réponds UNIQUEMENT en JSON valide :
{
  "hasDocument": true,
  "type": "ANALYSIS | REPORT | STACK | PROJECTION | RESEARCH",
  "title": "titre court et descriptif",
  "content": {
    "summary": "3-5 points clés",
    "sections": [{ "title": "...", "body": "..." }],
    "data": {}
  },
  "metadata": {
    "confidence": 0.85,
    "tags": ["tag1", "tag2"]
  }
}`,
      },
      {
        role: "user",
        content: messagesText,
      },
    ], { maxTokens: 1500, temperature: 0.2 })

    let parsed: { hasDocument: boolean; type?: string; title?: string; content?: object; metadata?: object }
    try {
      parsed = JSON.parse(content)
    } catch {
      return
    }

    if (!parsed.hasDocument || !parsed.type || !parsed.title) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    await fetch(`${appUrl}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({
        dossierId,
        type: parsed.type,
        title: parsed.title,
        producedBy: managerName,
        poleCode,
        sourceKind: "session",
        sourceId: sessionId,
        content: parsed.content ?? { summary: "", sections: [], data: {} },
        metadata: { ...(parsed.metadata ?? {}), relatedDocuments: [], relatedCards: [], relatedTasks: [] },
      }),
    })
  } catch {
    // Fire-and-forget — silently ignore errors
  }
}

export interface ExpertResponse {
  analysis: string
  proposedCard: {
    type: string
    title: string
    content: Record<string, unknown>
  }
  confidence: number
  blocksLabTransition: boolean
  requiredActions: string[]
}

export interface ExpertMessage {
  role: "user" | "assistant"
  content: string
}

export interface QuestionItem {
  question: string
  choices: string[]
  multiSelect?: boolean
  description?: string
}

export interface ChatMessage {
  id: string
  role: "expert" | "user"
  content: string
  timestamp: string
  choices?: string[]
  questions?: QuestionItem[]
  proposedCard?: { type: string; title: string; content: unknown }
  confidence?: number
  attachments?: { name: string; type: string; size?: number }[]
  /** Snapshot of onboardingState before this expert turn — used for DELETE rollback */
  _stateBefore?: Record<string, unknown>
}

export interface ExpertChatResponse {
  message: string
  choices?: string[]
  proposedCard?: { type: string; title: string; content: Record<string, unknown> }
  confidence?: number
  isComplete?: boolean
}

export async function invokeExpert(
  systemPrompt: string,
  messages: ExpertMessage[],
  contextCards: Array<{ type: string; title: string; content: unknown }>
): Promise<ExpertResponse> {
  const contextBlock =
    contextCards.length > 0
      ? `\n\nCONTEXT CARDS:\n${JSON.stringify(contextCards, null, 2)}`
      : ""

  const fullSystemPrompt = `${systemPrompt}${contextBlock}

IMPORTANT: You MUST respond with a single valid JSON object matching exactly this schema:
{
  "analysis": "string - your analysis",
  "proposedCard": {
    "type": "string - the card type",
    "title": "string - card title",
    "content": {} - structured card content
  },
  "confidence": number between 0 and 1,
  "blocksLabTransition": boolean,
  "requiredActions": ["string array of required actions if any"]
}
Do not include any text outside the JSON object.`

  const { content: text } = await callLLM(
    [
      { role: "system", content: fullSystemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    { maxTokens: 4096 }
  )

  try {
    const parsed = JSON.parse(text) as ExpertResponse
    return parsed
  } catch {
    throw new Error(`Expert returned invalid JSON: ${text.slice(0, 200)}`)
  }
}

export async function getExpertInitialMessage(
  expertName: string,
  expertRole: string,
  dossierName: string,
  validatedCards: Array<{ type: string; title: string }>
): Promise<ExpertChatResponse> {
  const context =
    validatedCards.length > 0
      ? `\nCartes déjà validées: ${validatedCards.map((c) => c.title).join(", ")}`
      : ""

  const systemPrompt = `Tu es ${expertName}, ${expertRole}. Tu travailles sur le projet "${dossierName}".${context}

Génère un message d'accueil engageant (2-3 phrases max) en français, puis pose UNE question clé pour mieux comprendre le projet.
Propose 3-4 options de réponse courtes et pertinentes.

Réponds en JSON:
{
  "message": "ton message d'accueil + question",
  "choices": ["option 1", "option 2", "option 3", "Autre (précisez)"]
}
Le message doit être naturel, direct, orienté action.`

  const { content: text } = await callLLM(
    [{ role: "system", content: systemPrompt }],
    { maxTokens: 800 }
  )
  try {
    return JSON.parse(text) as ExpertChatResponse
  } catch {
    return {
      message: `Bonjour ! Je suis ${expertName}. Parlez-moi de votre projet "${dossierName}" — quel problème principal cherchez-vous à résoudre ?`,
      choices: ["Un problème de productivité", "Un problème d'accès", "Un problème de coût", "Autre (précisez)"],
    }
  }
}

export async function invokeExpertChat(
  systemPrompt: string,
  history: ChatMessage[],
  contextCards: Array<{ type: string; title: string; content: unknown }>,
  userInput: string,
  expertName: string
): Promise<ExpertChatResponse> {
  const contextBlock =
    contextCards.length > 0
      ? `\n\nCartes validées du projet:\n${JSON.stringify(contextCards, null, 2)}`
      : ""

  const fullSystem = `${systemPrompt}${contextBlock}

Tu es en conversation avec l'utilisateur. Réponds en JSON:
{
  "message": "ta réponse naturelle en français",
  "choices": ["option1", "option2", "option3"],  // OPTIONNEL: uniquement si une question fermée est pertinente
  "proposedCard": {  // OPTIONNEL: uniquement quand tu as assez d'info pour créer une carte
    "type": "le type de carte",
    "title": "titre clair",
    "content": {}
  },
  "confidence": 0.9,  // OPTIONNEL: avec proposedCard
  "isComplete": false  // true quand tu proposes une carte finale
}
Sois concis, direct, orienté décision. Max 3 phrases par réponse.`

  const msgs: LLMMessage[] = [
    { role: "system", content: fullSystem },
    ...history.map((m) => ({
      role: (m.role === "expert" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userInput },
  ]

  const { content: text } = await callLLM(msgs, { maxTokens: 2048 })
  try {
    return JSON.parse(text) as ExpertChatResponse
  } catch {
    return { message: `Merci pour cette précision. Pouvez-vous développer davantage ?` }
  }
}

import type { AspectKey } from "./onboarding-state"
import { VALID_LABS, safeValidateLab } from "./onboarding-state"

export interface MissionProposal {
  poleCode: string
  managerName: string
  initialObjective: string
  clarifyingQuestions: string[]
}

export interface KAELResponse {
  message: string
  choices?: string[]
  questions?: QuestionItem[]
  recommendedLab?: string
  recommendedExperts?: string[]
  routedPole?: string
  routedManager?: string
  routingReason?: string
  confirmedAspects?: AspectKey[]
  aspectQuality?: Partial<Record<AspectKey, "strong" | "weak">>
  challengeCount?: Partial<Record<AspectKey, number>>
  isComplete?: boolean
  missionProposal?: MissionProposal
}

const HASHTAG_POLE_MAP: Record<string, { poleCode: string; managerName: string }> = {
  brainstorming: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  challenge: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  strategie: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  pitch: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  vision: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  positionnement: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  market: { poleCode: "P02_MARKET", managerName: "MAYA" },
  veille: { poleCode: "P02_MARKET", managerName: "MAYA" },
  concurrents: { poleCode: "P02_MARKET", managerName: "MAYA" },
  tendances: { poleCode: "P02_MARKET", managerName: "MAYA" },
  tam: { poleCode: "P02_MARKET", managerName: "MAYA" },
  opportunite: { poleCode: "P02_MARKET", managerName: "MAYA" },
  produit: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  tech: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  architecture: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  mvp: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  stack: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  features: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  finance: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  budget: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  modele: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  investisseur: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  roi: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  cashflow: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  marketing: { poleCode: "P05_MARKETING", managerName: "SKY" },
  brand: { poleCode: "P05_MARKETING", managerName: "SKY" },
  contenu: { poleCode: "P05_MARKETING", managerName: "SKY" },
  seo: { poleCode: "P05_MARKETING", managerName: "SKY" },
  growth: { poleCode: "P05_MARKETING", managerName: "SKY" },
  copy: { poleCode: "P05_MARKETING", managerName: "SKY" },
  legal: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  rgpd: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  contrat: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  compliance: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  gdpr: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  talent: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  recrutement: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  ops: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  coordination: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
}

export function detectPoleRouting(input: string): { poleCode: string; managerName: string } | null {
  const matches = input.match(/#(\w+)/g)
  if (!matches) return null
  for (const match of matches) {
    const tag = match.slice(1).toLowerCase()
    if (HASHTAG_POLE_MAP[tag]) return HASHTAG_POLE_MAP[tag]
  }
  return null
}

export async function invokeKAEL(
  dossierName: string,
  history: ChatMessage[],
  userInput: string,
  projectMemory?: string,
  previousSessionContext?: string
): Promise<KAELResponse> {
  const routing = detectPoleRouting(userInput)
  if (routing) {
    return {
      message: `Je vous connecte à **${routing.managerName}** — ${getPoleDescription(routing.poleCode)}.`,
      routedPole: routing.poleCode,
      routedManager: routing.managerName,
      routingReason: "Hashtag détecté dans le message",
    }
  }

  const briefBlock = projectMemory
    ? `\n\n[BRIEF PROJET]\n${projectMemory}\n[FIN BRIEF]`
    : ""

  const prevSessionBlock = previousSessionContext
    ? `\n\n[SESSIONS PRÉCÉDENTES — RÉSUMÉ]\n${previousSessionContext}\n[FIN SESSIONS PRÉCÉDENTES]`
    : ""

  const system = `Tu es KAEL, Chief of Staff de k3rn.labs pour le projet "${dossierName}".
Tu es un conseiller senior : tu analyses, tu challenges, tu délègues avec précision.
Tu parles avec autorité naturelle — ni distant, ni complaisant. Ton style : factuel, direct, orienté action.
Tu as une mémoire complète du projet ci-dessous — tu t'en sers activement dans chaque réponse.${briefBlock}${prevSessionBlock}

TON RÔLE :
1. Analyser la situation à partir du brief — ne jamais demander ce qui est déjà connu
2. Identifier les prochains leviers critiques : score faible, lab bloqué, aspect weak, carte manquante
3. Déléguer proactivement vers le bon pôle dès le premier message pertinent — pas seulement après relance
4. Challenger les décisions avec des questions précises — jamais de validation creuse

PÔLES DISPONIBLES :
- AXEL (P01_STRATEGIE) — stratégie, pitch, vision, positionnement
- MAYA (P02_MARKET) — marché, veille, concurrents, TAM
- KAI (P03_PRODUIT_TECH) — produit, tech, MVP, architecture
- ELENA (P04_FINANCE) — finance, modèle économique, investisseurs, budget
- SKY (P05_MARKETING) — marketing, brand, SEO, growth
- MARCUS (P06_LEGAL) — legal, RGPD, contrats, compliance
- NOVA (P07_TALENT_OPS) — talent, recrutement, opérations

DIMENSIONS DU SCORE (4 — source de vérité pour tes recommandations) :
- Marché     : Problem × TAM — expert : MAYA
- Produit    : Faisabilité & désirabilité — expert : KAI
- Finance    : Viabilité business & unit economics — expert : ELENA
- Validation : Signal traction (interviews, preuves marché) — expert : AXEL ou MAYA
→ Le brief indique le "LEVIER PRIORITAIRE" — tu t'en sers en premier pour router.

COMPORTEMENT :
- Si un score de dimension est < 30% → signale le gap ET propose immédiatement l'expert adapté via missionProposal
- Si le brief indique un LEVIER PRIORITAIRE → commence par ce levier, propose une mission à l'expert indiqué
- Si l'onboarding est incomplet ou des aspects sont "à affiner" → identifie lesquels, propose une action concrète
- Si le lab est bloqué → explique concrètement ce qui manque, propose le prochain pas actionnable
- Si l'utilisateur évoque un sujet métier → propose une mission à l'expert adapté dès ce message (missionProposal OBLIGATOIRE dans ce cas)
- Toujours 2-3 phrases max + action concrète

FRAMING POSITIF (important) :
- En phase DISCOVERY : le projet est "en cours de structuration" — jamais "bloqué" ou "problème"
- Score faible = "dimension à renforcer", pas "manque"
- Aspect weak = "à préciser", pas "insuffisant"
- Le workspace k3rn.labs est un espace de progression : onboarding → brief complet → experts → livrables → labs avancés

EXPLICATION DU WORKSPACE (si l'utilisateur semble perdu ou pose une question sur "quoi faire") :
- Le workspace suit un processus : onboarding pour structurer le brief → experts pour approfondir chaque dimension → cartes validées dans le Memory Graph → transition vers le lab suivant
- Chaque pôle expert produit des livrables concrets (cartes) qui alimentent le score et débloquent les transitions

RÈGLE ANTI-RÉPÉTITION (CRITIQUE) :
- Ne répète JAMAIS une information ou une recommandation déjà donnée dans l'historique de cette session
- Si tu as déjà proposé un missionProposal dans l'historique ET que l'utilisateur répond "go", "oui", "ok", "lance" → ne répète pas le même missionProposal, dis-lui de cliquer sur "Envoyer en mission" dans la carte ci-dessus
- JAMAIS répéter le même objectif de mission deux fois de suite

RÈGLE choices OBLIGATOIRE :
- Si tu n'inclus pas de missionProposal → tu DOIS inclure choices avec 2-3 options d'action concrètes
- Si tu inclus un missionProposal → choices est optionnel
- JAMAIS un message sans choices ET sans missionProposal — l'utilisateur doit toujours avoir une action claire

RÉPONDRE DIRECTEMENT vs PROPOSER UNE MISSION :
- Si la question peut être répondue à partir du brief ou de tes connaissances générales → RÉPONDS DIRECTEMENT, sans missionProposal
  (exemples : "c'est quoi un TAM ?", "comment structurer un pitch ?", "explique-moi ce lab", "donne-moi ton avis sur X")
- Si la tâche nécessite une recherche externe, une analyse de données de marché, un audit approfondi, ou une production de livrable → propose un missionProposal
  (exemples : "analyse mes concurrents", "estime le TAM de mon marché", "rédige mes projections financières")
- Règle simple : peux-tu répondre correctement MAINTENANT avec ce que tu sais ? → réponds. Sinon → mission.

MISSIONS — RÈGLE UNIVERSELLE :
- TOUS les experts passent par missionProposal — il n'y a PAS de routedPole direct
- Chaque proposition d'expert génère un missionProposal avec : objectif précis, poleCode, managerName
- L'utilisateur choisit ensuite : "Envoyer en mission" (autonome, consomme budget) OU "Session interactive" (chat direct)
- Ne JAMAIS lancer une mission sans que l'utilisateur l'ait confirmée — tu proposes, l'utilisateur décide
- Dans missionProposal : formuler un objectif actionnable et précis (pas générique)

INTERDITS :
- "Qu'est-ce que tu veux explorer ?" quand tu as un brief complet → propose, ne demande pas
- Reformuler le projet comme si tu ne le connaissais pas
- "Super idée !", "Excellent !", validation sans substance
- Router sans raison ancrée dans le brief du projet
- Analyser sans proposer d'action (choices ou routing ou mission) — chaque réponse se termine par un choix concret
- Déclencher une mission automatiquement sans proposition explicite à l'utilisateur

Réponds en JSON :
{
  "message": "réponse naturelle en français — 2-3 phrases, ton conseiller senior",
  "choices": ["action concrète 1", "action concrète 2"],
  "recommendedLab": "NOM_DU_LAB",
  "missionProposal": {
    "poleCode": "P03_PRODUIT_TECH",
    "managerName": "KAI",
    "initialObjective": "Définir les spécifications techniques du MVP — stack, architecture, fonctionnalités prioritaires et estimations de délai",
    "clarifyingQuestions": ["Quelles sont les 3 fonctionnalités absolument indispensables pour le MVP ?"]
  }
}
message est OBLIGATOIRE. choices est OBLIGATOIRE si missionProposal est absent. routedPole N'EXISTE PLUS — utiliser exclusivement missionProposal pour recommander un expert.`

  const msgs: LLMMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userInput },
  ]

  const { content: text } = await callLLM(msgs, { maxTokens: 1024 })
  try {
    return JSON.parse(text) as KAELResponse
  } catch {
    return { message: "Pouvez-vous me préciser le point que vous souhaitez avancer en priorité ?" }
  }
}

/**
 * Génère le message d'ouverture proactif de KAEL pour une nouvelle session.
 * KAEL analyse le brief et identifie le levier critique le plus important.
 */
export async function generateKAELOpener(dossierName: string, projectMemory: string, previousSessionContext?: string): Promise<{ message: string; choices?: string[] }> {
  if (!projectMemory) {
    return {
      message: `Bonjour. Je suis KAEL, votre Chief of Staff sur **${dossierName}**.\n\nJe n'ai pas encore de contexte sur ce projet. Décrivez votre situation et je vous guide sur les prochaines priorités.`,
      choices: ["Décrire mon projet", "Voir comment fonctionne le workspace", "Reprendre l'onboarding"],
    }
  }

  const prevBlock = previousSessionContext
    ? `\n\n[SESSIONS PRÉCÉDENTES]\n${previousSessionContext}\n[FIN SESSIONS PRÉCÉDENTES]`
    : ""

  const system = `Tu es KAEL, Chief of Staff de k3rn.labs pour le projet "${dossierName}".
Tu as une mémoire complète du projet ci-dessous. Tu ouvres la session avec un message court et proactif.

[BRIEF PROJET]
${projectMemory}
[FIN BRIEF]${prevBlock}

RÈGLES DU MESSAGE D'OUVERTURE :
- Commence par une observation précise tirée du brief (score, aspect faible, lab bloqué, carte manquante)
- Propose immédiatement une action concrète avec 2-3 choices cliquables
- 2-3 phrases max
- Framing positif : "à renforcer" / "à préciser" — jamais "bloqué" ou "manque"
- Ton : conseiller senior, direct, factuel — pas "Bonjour je suis KAEL bla bla"
- INTERDIT : reformuler tout le projet, poser des questions vagues, faire du remplissage
- Si des sessions précédentes existent → NE PAS répéter ce qui y a été dit ou décidé. Commence depuis où on en est.

Exemples corrects :
- message: "Votre score marché est à 15% — la cible est à préciser." | choices: ["Connecter Maya pour le TAM", "Affiner la cible directement", "Voir l'état du brief complet"]
- message: "Le lab DISCOVERY est en cours — il manque des cartes validées pour progresser." | choices: ["Démarrer avec KAI sur le produit", "Demander à AXEL la stratégie", "Voir les cartes existantes"]
- message: "Trois aspects de votre onboarding sont à préciser." | choices: ["Affiner le problème", "Préciser la cible", "Revoir la contrainte"]

Réponds en JSON : { "message": "ton message d'ouverture", "choices": ["action 1", "action 2", "action 3"] }`

  const { content: text } = await callLLM(
    [{ role: "system", content: system }],
    { maxTokens: 400, temperature: 0.4 }
  )
  try {
    const parsed = JSON.parse(text) as { message: string; choices?: string[] }
    if (!parsed.message) throw new Error("no message")
    return parsed
  } catch {
    return {
      message: `Bonjour. Je suis KAEL, votre Chief of Staff sur **${dossierName}**. Que souhaitez-vous avancer ?`,
      choices: ["Voir l'état du projet", "Consulter un expert", "Progresser vers le lab suivant"],
    }
  }
}

/**
 * Déclenche une synthèse KAEL après une session avec un pôle expert.
 * Fire and forget — ne bloque pas la réponse API.
 * La note est persistée dans la kaelSession active du dossier.
 */
export async function triggerKAELPostSessionNote(
  dossierId: string,
  poleCode: string,
  managerName: string,
  exchangeSummary: string
): Promise<void> {
  const system = `Tu es KAEL, Chief of Staff de k3rn.labs.
${managerName} (${poleCode}) vient de terminer un échange avec le fondateur. Voici le résumé de l'échange :

${exchangeSummary}

Génère une note de synthèse interne — 2-3 lignes max :
- Ce qui a été décidé ou produit
- Le point de vigilance ou la prochaine action critique
- Aucun remplissage, aucune reformulation

Réponds en JSON : { "note": "ta synthèse interne" }`

  try {
    const { content: text } = await callLLM(
      [{ role: "system", content: system }],
      { maxTokens: 200, temperature: 0.3 }
    )
    const parsed = JSON.parse(text) as { note: string }
    if (!parsed.note) return

    // Import dynamique pour éviter une dépendance circulaire
    const { db: prisma } = await import("./db")
    const activeSession = await prisma.kaelSession.findFirst({
      where: { dossierId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    })
    if (!activeSession) return

    const messages = (activeSession.messages as Array<Record<string, unknown>>) ?? []
    await prisma.kaelSession.update({
      where: { id: activeSession.id },
      data: {
        messages: [
          ...messages,
          {
            id: crypto.randomUUID(),
            role: "kael_note",
            content: `[Note post-session ${managerName}] ${parsed.note}`,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })
  } catch {
    // Fire and forget — never throw
  }
}

function getPoleDescription(poleCode: string): string {
  const descriptions: Record<string, string> = {
    P01_STRATEGIE: "Stratège & Innovation",
    P02_MARKET: "Market & Intelligence",
    P03_PRODUIT_TECH: "Produit & Tech",
    P04_FINANCE: "Finance & Modélisation",
    P05_MARKETING: "Marketing & Brand",
    P06_LEGAL: "Legal & Compliance",
    P07_TALENT_OPS: "Talent & Ops",
  }
  return descriptions[poleCode] ?? poleCode
}

export interface FileContext {
  name: string
  kind: "text" | "image"
  content?: string
  dataUrl?: string
}

export async function invokeChefDeProjet(
  dossierName: string,
  history: ChatMessage[],
  userInput: string,
  files?: FileContext[],
  currentStep?: "FREE_INPUT" | "IN_PROGRESS" | "COMPLETE",
  stateContext?: {
    currentQuestion: string | null
    confirmedAspects: string[]
    confirmedValues?: Record<string, string>
    confirmedQualities?: Partial<Record<string, "strong" | "weak">>
    challengeCounts?: Partial<Record<string, number>>
  }
): Promise<KAELResponse> {
  const isFirstMessage = currentStep === "FREE_INPUT" || history.length === 0
  const hasFiles = files && files.length > 0
  const textFiles = files?.filter((f) => f.kind === "text" && f.content) ?? []
  const imageFiles = files?.filter((f) => f.kind === "image" && f.dataUrl) ?? []

  // Truncate each file to 8000 chars max to keep context reasonable
  const fileBlock = textFiles.length > 0
    ? "\n\n--- FICHIERS FOURNIS ---\n" +
    textFiles.map((f) => {
      const content = (f.content ?? "").slice(0, 8000)
      const truncated = (f.content ?? "").length > 8000 ? "\n[… tronqué]" : ""
      return `### ${f.name}\n${content}${truncated}`
    }).join("\n\n---\n\n") +
    "\n--- FIN FICHIERS ---"
    : ""

  const confirmedList = stateContext?.confirmedAspects ?? []
  const currentQ = stateContext?.currentQuestion ?? "problem"

  const confirmedValues = stateContext?.confirmedValues ?? {}
  const confirmedQualities = stateContext?.confirmedQualities ?? {}
  const challengeCounts = stateContext?.challengeCounts ?? {}

  // Build stateBlock — confirmed aspects avec valeur + qualité
  const confirmedLines = confirmedList.map((k: string) => {
    const v = confirmedValues[k]
    const q = confirmedQualities[k]
    const badge = q === "weak" ? " [à affiner]" : ""
    return v
      ? `  ✓ ${k}${badge} : "${v.slice(0, 80)}${v.length > 80 ? "…" : ""}"`
      : `  ✓ ${k}${badge}`
  }).join("\n") || "  (aucun encore)"

  // challengeCount courant pour l'aspect en cours
  const currentChallengeCount = challengeCounts[currentQ] ?? 0

  // Reminder positionné en fin de prompt (poids recency)
  const allAspects = ["problem", "target", "outcome", "constraint"]
  const remainingAspects = allAspects.filter((a) => !confirmedList.includes(a))
  const remainingStr = remainingAspects.length > 0
    ? `\n→ Aspects RESTANTS à collecter : ${remainingAspects.join(", ")}\n→ Prochain aspect à traiter : "${remainingAspects[0]}"\n   · Si l'utilisateur vient de répondre sur cet aspect → confirme-le dans confirmedAspects (strong ou weak), puis pose la question sur l'aspect suivant (ou isComplete:true si c'était le dernier).\n   · Si l'utilisateur n'a pas encore répondu sur cet aspect → pose une question directe et courte dessus.\n   · JAMAIS un acquittement seul sans question ni complétion.`
    : "\n→ Tous les aspects sont confirmés → isComplete: true OBLIGATOIRE — message de clôture chaleureux."
  const stateReminder = stateContext && confirmedList.length > 0
    ? `\n\n⚠️ ÉTAT FINAL — CRITIQUE :\nAspects VERROUILLÉS (ne plus poser de questions dessus) :\n${confirmedLines}\n→ Aspect en cours de challenge : "${currentQ}" (challenges : ${currentChallengeCount}/4)${remainingStr}`
    : ""

  const stateBlock = stateContext
    ? `\n⚙️ ÉTAT SERVEUR :\n${confirmedLines}\n→ Aspect en cours : "${currentQ}" | Challenges effectués : ${currentChallengeCount}/4`
    : ""

  // JSON example dynamique — reflète l'état réel
  const exampleConfirmed = JSON.stringify(confirmedList.length > 0 ? confirmedList : ["problem"])
  const exampleQuality = JSON.stringify(
    confirmedList.length > 0
      ? Object.fromEntries(confirmedList.map((k: string) => [k, confirmedQualities[k] ?? "strong"]))
      : { problem: "strong" }
  )

  const system = `Tu es KAEL, copilote cognitif de k3rn.labs — tu accompagnes la construction du projet "${dossierName}".
Tu es l'équivalent d'un associé YC en session de travail : direct, curieux, exigeant sur la clarté — jamais condescendant, jamais générique.
${stateBlock}

TON RÔLE DUAL :
1. Interlocuteur naturel — tu suis le fil de ce que l'utilisateur dit, tu réagis à CE QU'IL VIENT D'ÉCRIRE, pas à un script
2. Extracteur contextuel — tu identifies silencieusement les 4 aspects dans ce qu'il dit

4 ASPECTS À COLLECTER :
1. "problem"     → Douleur concrète avec fréquence ou intensité mesurable
2. "target"      → Segment précis avec attribut discriminant
3. "outcome"     → Résultat mesurable pour le client final (pas le prestataire)
4. "constraint"  → Obstacle réel, spécifique à CE marché ou CE modèle

CRITÈRES DE SOLIDITÉ (standard pitch seed) :
- problem FORT : douleur nommée + signal quantifiable (fréquence, intensité, coût temps/argent) | FAIBLE : vague, solution déguisée
- target FORT : UN segment précis avec attribut discriminant — un VC peut esquisser un TAM | FAIBLE : "tout le monde", deux cibles simultanées sans priorisation
- outcome FORT : métrique ou état avant/après mesurable pour le CLIENT FINAL | FAIBLE : "amélioration", "gain de temps" sans précision — ⚠️ distinguer la douleur du prestataire (problem) du résultat pour son client (outcome)
- constraint FORT : obstacle propre à CE secteur ou CE modèle (adoption, régulation, switching cost, etc.) | FAIBLE : "ressources", "trouver des clients" — universel, non discriminant

RÈGLES ANTI-VALIDATION PRÉMATURÉE :
- Cible double ("A + B") → jamais strong — challenger une fois sur le client payant principal. Si double persiste → weak
- Outcome sans chiffre ni avant/après → jamais strong — toujours challenger une fois
- Contrainte universelle ("temps/argent/tech") → jamais strong — challenger : l'obstacle propre à CE marché
- NE PAS valider sur la longueur ou l'enthousiasme de la réponse

ULTRA-PERSONNALISATION — RÈGLE CENTRALE :
Chaque question, chaque acquittement, chaque challenge DOIT être ancré dans les mots exacts de l'utilisateur.
- Si l'utilisateur parle de "coachs sportifs à domicile" → ta question concerne les coachs sportifs à domicile, pas "les prestataires" ou "les professionnels"
- Si l'utilisateur mentionne "Notion" → ta question peut référencer Notion, pas "les outils existants"
- Si l'utilisateur cite "3 heures par semaine" → reprends ce chiffre précis
- INTERDIT : questions qui pourraient s'appliquer à n'importe quel projet ("Quel est ton marché cible ?", "Quels obstacles anticipez-vous ?", "Qui sont vos utilisateurs ?")
- INTERDIT : questions avec des catégories génériques en choices ("B2B / B2C", "Petites / Moyennes / Grandes entreprises", "Court terme / Long terme")
- Les choices doivent être des options RÉELLES issues du contexte du projet — jamais des catégories abstraites

COMPORTEMENT SUR MESSAGE RICHE (premier message ou message dense) :
- Extrais tous les aspects détectables — forts ET faibles (weak, pas absent)
- Commence par réagir naturellement à l'idée (1 phrase max qui montre que tu as compris CE projet spécifiquement)
- Puis challenge uniquement le PREMIER aspect faible dans l'ordre : target → outcome → constraint
- Ne pas lister ce que tu as compris — agis, ne résume pas
- Un aspect weak dans le 1er message doit être challengé au moins 1 fois avant d'être verrouillé

CHALLENGE CIBLÉ :
- Tu peux poser 1 ou 2 questions dans le même message si tu as planifié une série (ex: "Q1/2 : … Q2/2 : …")
- Si tu poses 2 questions, c'est une série déclarée — l'utilisateur répond aux deux avant que tu passes au suivant
- Chaque question doit montrer que tu as LU et COMPRIS CE PROJET — pas une formule recyclable
- JAMAIS : "pouvez-vous préciser ?", "qu'est-ce que vous entendez par là ?", "parlez-moi de X"
- Les choices répondent exactement à la question posée, avec les termes du projet, labels 2-5 mots
- ACQUITTEMENT : 1 phrase qui montre que tu as entendu — JAMAIS de compliment vague ("c'est ambitieux", "c'est intéressant", "ça aide à comprendre"). Reformule ce qui vient d'être dit dans tes propres mots, sans jugement.
- TRANSITION entre aspects : ne JAMAIS annoncer "Passons maintenant aux contraintes" — enchaine directement avec la question sur le prochain aspect

APRÈS 4 CHALLENGES SUR UN ASPECT (max) :
- Accepte (quality: "weak") et enchaîne immédiatement sur l'aspect suivant
- Acquittement court ancré dans la réponse reçue + question directe sur le suivant
- Jamais le même acquittement deux fois dans la conversation
- Si dernier aspect → isComplete: true, message de clôture chaleureux et spécifique au projet

CONVERSATION NATURELLE :
- Si l'utilisateur pose une question → réponds en 1-2 phrases, puis reviens vers l'aspect manquant
- Tu n'es pas un formulaire — tu as une vraie curiosité pour CE projet
- Après chaque aspect confirmé (strong ou weak) : terminer par la question sur le suivant. Jamais d'acquittement seul.
- UN MESSAGE NE PEUT PAS SE TERMINER PAR UN ACQUITTEMENT SEUL tant qu'il reste des aspects.

RÈGLES ABSOLUES :
- Aspects ✓ verrouillés — ne jamais les reposer
- isComplete: true seulement si les 4 aspects sont dans confirmedAspects
- choices UNIQUEMENT si le message contient une question directe — jamais sur une transition ou un acquittement
- recommendedLab parmi : DISCOVERY, STRUCTURATION, VALIDATION_MARCHE, DESIGN_PRODUIT, ARCHITECTURE_TECHNIQUE, BUSINESS_FINANCE${fileBlock}
${isFirstMessage && !hasFiles ? "\nPREMIER MESSAGE : réagis à l'idée spécifique présentée, extrais les aspects présents, challenge le premier point faible ou manquant avec une question ancrée dans CE projet." : ""}
${hasFiles ? "\nFICHIERS FOURNIS : extrais les aspects présents, challenge ce qui est faible ou manquant." : ""}

Réponds en JSON :
{
  "message": "Ta réponse — ancrée dans les mots du projet, naturelle, jamais générique",
  "choices": ["Option tirée du contexte projet 1", "Option tirée du contexte projet 2"],
  "questions": [
    { "question": "Question spécifique au projet ?", "choices": ["Option réelle A", "Option réelle B"], "multiSelect": false }
  ],
  "confirmedAspects": ${exampleConfirmed},
  "aspectQuality": ${exampleQuality},
  "challengeCount": { "${currentQ}": ${currentChallengeCount} },
  "recommendedLab": "DISCOVERY",
  "isComplete": false
}

choices : labels courts (2-5 mots), tirés du contexte du projet — JAMAIS des catégories abstraites.
questions : pour un questionnaire multi-aspects (2-4 items). Jamais choices + questions simultanément.
confirmedAspects = tous les aspects collectés. aspectQuality = qualité de chacun. challengeCount = challenges sur l'aspect en cours.${stateReminder}`
  // Build messages — images go into content array for vision, plain string otherwise
  // OpenAI rejects response_format:json_object when content is an array → only use array if images present
  const userText = userInput || (hasFiles ? "Voici les fichiers du projet." : "")
  const userContent: string | Array<{ type: string;[key: string]: unknown }> =
    imageFiles.length > 0
      ? [
          { type: "text", text: userText },
          ...imageFiles.map((f) => ({
            type: "image_url",
            image_url: { url: f.dataUrl!, detail: "high" },
          })),
        ]
      : userText

  const msgs: LLMMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userContent },
  ]

  const { content: text } = await callLLM(msgs, { maxTokens: 1024, timeoutMs: 28000, temperature: 0.3 })
  try {
    const parsed = JSON.parse(text) as KAELResponse

    if (!parsed.message || typeof parsed.message !== "string") {
      return {
        message: "J'ai analysé votre fichier. Quel problème concret ce projet cherche-t-il à résoudre ?",
        choices: parsed.choices ?? ["Résoudre un problème métier précis", "Saisir une opportunité de marché", "Améliorer un processus existant"],
        confirmedAspects: [],
      }
    }

    // Guard: recommendedLab must be a valid LAB — server enforces via safeValidateLab
    parsed.recommendedLab = safeValidateLab(parsed.recommendedLab)

    // Guard: challengeCount capped at 2 (server forces weak at >= 2)
    if (parsed.challengeCount) {
      for (const k of Object.keys(parsed.challengeCount) as AspectKey[]) {
        if (typeof parsed.challengeCount[k] === "number") {
          parsed.challengeCount[k] = Math.min(parsed.challengeCount[k]!, 2)
        }
      }
    }

    // Guard: isComplete requires all 4 aspects confirmed
    const aspects = parsed.confirmedAspects ?? []
    const allConfirmed = (["problem", "target", "outcome", "constraint"] as AspectKey[]).every((a) =>
      aspects.includes(a)
    )
    if (parsed.isComplete && !allConfirmed) {
      parsed.isComplete = false
    }

    return parsed
  } catch {
    return {
      message: "Intéressant ! Quel problème concret ce projet cherche-t-il à résoudre ?",
      choices: ["Résoudre un problème métier précis", "Saisir une opportunité de marché", "Améliorer un processus existant"],
      confirmedAspects: [],
    }
  }
}

/**
 * invokeExpertDirect — Appel LLM direct pour une session pôle expert.
 * Utilise le systemPrompt stocké en DB + le contexte projet.
 * Invocation directe de l'expert pour les sessions interactives.
 */
export async function invokeExpertDirect(params: {
  managerName: string
  systemPrompt: string
  userMessage: string
  history: Array<{ role: "user" | "assistant"; content: string }>
  projectMemory: string
  labContext: string
}): Promise<string> {
  const system = `${params.systemPrompt}

[CONTEXTE DU PROJET]
${params.projectMemory || "Contexte projet non disponible."}

Lab actif : ${params.labContext}

RÈGLES DE COMPORTEMENT :
- Tu es ${params.managerName}, expert dans ton domaine. Incarne pleinement ce rôle.
- Réponds de façon directe, concrète et actionnables — pas de généralités.
- Chaque réponse doit apporter une valeur tangible : analyse, framework, plan, recommandations chiffrées.
- Si tu produis un livrable structuré (rapport, analyse, plan technique, modélisation), structure-le clairement avec des sections numérotées.
- Ne reformule pas ce que l'utilisateur vient de dire — va directement à l'essentiel.
- Adapte le niveau de détail à la question : question simple → réponse courte ; demande d'analyse → livrable complet.`

  const msgs: LLMMessage[] = [
    { role: "system", content: system },
    ...params.history,
    { role: "user", content: params.userMessage },
  ]

  try {
    const { content } = await callLLM(msgs, { maxTokens: 2048, temperature: 0.7, responseFormat: { type: "text" } })
    return content
  } catch (err) {
    console.error("[invokeExpertDirect] error:", err)
    return `Désolé, une erreur est survenue. Peux-tu reformuler ta demande ?`
  }
}
