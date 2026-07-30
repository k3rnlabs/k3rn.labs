import type { Metadata, Viewport } from "next"
import { MIRAVA } from "@/lib/mirava/brand"
import { MiravaPwaRegistration } from "@/components/mirava/mirava-pwa"

export const metadata: Metadata = {
  title: { default: "MIRAVA Studio — Direction qui vous ressemble", template: "%s — MIRAVA Studio" },
  description: "Portraits premium de personal branding, créés depuis votre direction visuelle et votre identité.",
  applicationName: MIRAVA.name,
  openGraph: {
    title: "MIRAVA Studio — Direction qui vous ressemble",
    description: "Portraits premium de personal branding, créés depuis votre direction visuelle et votre identité.",
    siteName: MIRAVA.name,
    type: "website",
    images: [{ url: "/visual-engine/icon.svg", alt: MIRAVA.name }],
  },
  twitter: {
    card: "summary",
    title: "MIRAVA Studio — Direction qui vous ressemble",
    description: "Portraits premium de personal branding, créés depuis votre direction visuelle et votre identité.",
    images: ["/visual-engine/icon.svg"],
  },
  manifest: "/visual-engine/manifest.webmanifest",
  icons: {
    icon: [{ url: "/visual-engine/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/visual-engine/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: MIRAVA.name, statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = { themeColor: "#090a0a", colorScheme: "dark", viewportFit: "cover" }

export default function MiravaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<MiravaPwaRegistration /></>
}
