export const MIRAVA = {
  name: "MIRAVA Studio",
  legalStatus: "official-name" as const,
  routes: {
    home: "/visual-engine",
    studio: "/visual-engine/studio",
    offline: "/visual-engine/offline",
  },
  theme: {
    canvas: "var(--mirava-canvas)",
    surface: "var(--mirava-surface)",
    ink: "var(--mirava-ink)",
    accent: "var(--mirava-accent)",
    line: "var(--mirava-line)",
  },
} as const

export type MiravaLocale = "fr" | "es"

export const MIRAVA_STUDIO_PRESETS = [
  { id: "escapade-solaire", name: "Escapade solaire", description: "Mer, pierre claire et lumière dorée." },
  { id: "destination-iconique", name: "Destination iconique", description: "Architecture, skyline et allure jet-set." },
  { id: "beauty-close-up", name: "Beauté rapprochée", description: "Peau lumineuse, regard magnétique et flash précis." },
  { id: "editorial-mode", name: "Éditorial mode", description: "Silhouette sculpturale, contraste et haute mode." },
  { id: "night-glamour", name: "Glamour nocturne", description: "Flash nocturne, velours et présence confidentielle." },
  { id: "futuristic-muse", name: "Futuristic muse", description: "Eau prismatique, métal et reflets miroir." },
  { id: "lifestyle-creatrice", name: "Vie de créatrice", description: "Café en terrasse, suite lumineuse, carnet et réflexion." },
  { id: "athleisure-chic", name: "Athleisure chic", description: "Combi activewear mauve, miroir inox et allures shopping-fitness." },
  { id: "dubai-glamour", name: "Glamour Dubaï", description: "Soie noire, bijoux en or et flash sous le Burj Khalifa." },
  { id: "sport-glow", name: "Tennis Club Glow", description: "Tenue de tennis sculpturale et soleil sur terre battue." },
] as const

export type MiravaStudioPresetId = (typeof MIRAVA_STUDIO_PRESETS)[number]["id"]

export function getMiravaStudioPreset(id: string | null | undefined) {
  return MIRAVA_STUDIO_PRESETS.find((preset) => preset.id === id)
}

export const MIRAVA_STRIPE_PRODUCT = "mirava_studio"

export const MIRAVA_CREDIT_PACKS = [
  { id: "mirava-10", name: "Recarga Esencia — 10", credits: 10, priceEur: 29, kind: "pack" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_10 },
  { id: "mirava-30", name: "Recarga Aura — 30", credits: 30, priceEur: 79, kind: "pack" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_30 },
  { id: "mirava-100", name: "Recarga Casa — 100", credits: 100, priceEur: 199, kind: "pack" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_100 },
] as const

export const MIRAVA_SUBSCRIPTION_PLANS = [
  { id: "mirava-20", name: "MIRAVA Studio Esencia — 20", credits: 20, priceEur: 49, kind: "subscription" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_20 },
  { id: "mirava-60", name: "MIRAVA Studio Aura — 60", credits: 60, priceEur: 119, kind: "subscription" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_60 },
  { id: "mirava-150", name: "MIRAVA Studio Círculo — 150", credits: 150, priceEur: 249, kind: "subscription" as const, stripePriceId: process.env.STRIPE_PRICE_MIRAVA_150 },
] as const

export const MIRAVA_OFFERS = [...MIRAVA_SUBSCRIPTION_PLANS, ...MIRAVA_CREDIT_PACKS] as const

export type MiravaOfferId = (typeof MIRAVA_OFFERS)[number]["id"]

export function getMiravaOffer(id: string) {
  return MIRAVA_OFFERS.find((offer) => offer.id === id)
}

export function getMiravaPlanByPriceId(priceId: string | null | undefined) {
  return MIRAVA_SUBSCRIPTION_PLANS.find((plan) => plan.stripePriceId === priceId)
}

export function getMiravaPackById(id: string) {
  return MIRAVA_CREDIT_PACKS.find((pack) => pack.id === id)
}
