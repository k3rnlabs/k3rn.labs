import { cn } from "@/lib/utils"
import { MiravaMark } from "@/components/mirava/mirava-mark"

export function MiravaWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-jakarta text-lg font-semibold tracking-[0.16em] text-mirava-ink", className)}>
      <MiravaMark className="h-5 w-5 text-mirava-accent" />
      <span>MIRAVA<span className="ml-1.5 text-[.58em] font-medium tracking-[0.2em] text-mirava-ink-secondary">STUDIO</span></span>
    </span>
  )
}
