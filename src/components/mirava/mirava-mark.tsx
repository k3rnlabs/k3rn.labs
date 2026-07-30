import { cn } from "@/lib/utils"

export function MiravaMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path d="M10 8H28L21.5 28L28.5 48H10L16.5 28L10 8Z" fill="currentColor" />
      <path d="M46 8H31L24.5 28L33 48H46L39.5 28L46 8Z" fill="currentColor" />
    </svg>
  )
}
