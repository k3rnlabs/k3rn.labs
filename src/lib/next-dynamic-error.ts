/**
 * Next.js utilise des erreurs internes comme signaux de contrôle
 * pendant le prerendering. Elles ne doivent pas être transformées
 * en erreurs applicatives ni avalées par les couches d'authentification.
 */
export function isNextDynamicServerError(
  error: unknown,
): boolean {
  if (!error || typeof error !== "object") return false

  return (
    "digest" in error &&
    (error as { digest?: unknown }).digest ===
      "DYNAMIC_SERVER_USAGE"
  )
}
