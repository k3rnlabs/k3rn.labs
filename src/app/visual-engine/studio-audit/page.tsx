import { notFound } from "next/navigation"

/**
 * Deliberately minimal local-only route used while reviewing the MIRAVA shell.
 * It must never expose an audit surface in a deployed environment.
 */
export default function MiravaStudioAuditPage() {
  if (process.env.NODE_ENV !== "development") notFound()

  return (
    <main className="mirava-theme min-h-dvh bg-mirava-canvas p-6 text-mirava-ink">
      <p className="mirava-label">MIRAVA / LOCAL REVIEW</p>
      <h1 className="mirava-section-title mt-3 text-3xl">Studio audit local</h1>
      <p className="mirava-copy mt-3 max-w-lg text-sm leading-6">
        This route is available only on a local development server. It contains no customer data or production controls.
      </p>
    </main>
  )
}
