// Legacy aliases only: retained so historic Stripe webhooks remain idempotent.
// New MIRAVA checkout never exposes these ids or Visual Engine copy.
export const STUDIO_CREDIT_PACKS = [
  { id: "studio-10", name: "Essentiel", credits: 10, priceEur: 29 },
  { id: "studio-30", name: "Signature", credits: 30, priceEur: 79 },
  { id: "studio-100", name: "Atelier", credits: 100, priceEur: 199 },
] as const

export type StudioCreditPackId = (typeof STUDIO_CREDIT_PACKS)[number]["id"]

export function getStudioCreditPack(id: string) {
  return STUDIO_CREDIT_PACKS.find((pack) => pack.id === id)
}
