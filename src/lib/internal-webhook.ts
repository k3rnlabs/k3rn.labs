/**
 * Authentication shared by K3RN workers and internal callbacks.
 *
 * Every internal caller must send the dedicated header. A missing secret never
 * grants access.
 */
export function hasValidInternalWebhookSecret(request: Pick<Request, "headers">): boolean {
  const expected = process.env.INTERNAL_WEBHOOK_SECRET
  const received = request.headers.get("x-internal-secret")

  return Boolean(expected && received && received === expected)
}
