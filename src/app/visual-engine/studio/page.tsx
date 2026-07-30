import { Metadata } from "next"
import { VisualEngineStudio } from "@/components/studio/visual-engine-studio"

export const metadata: Metadata = { title: "Créer" }

export default function VisualEngineStudioPage() {
  return <VisualEngineStudio />
}
