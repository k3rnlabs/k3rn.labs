"use client"

import {
  type ReactNode,
  useRef,
} from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

export function MiravaDarkroomSheet({
  open,
  onOpenChange,
  children,
  onReturnFocus,
  variant,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  onReturnFocus?: () => void
  variant: "credit" | "auth"
  className?: string
}) {
  const contentRef =
    useRef<HTMLDivElement>(null)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-md" />

        <DialogPrimitive.Content
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            onReturnFocus?.()
          }}
          data-mirava-darkroom-sheet
          data-mirava-credit-sheet={
            variant === "credit"
              ? ""
              : undefined
          }
          data-mirava-auth-sheet={
            variant === "auth"
              ? ""
              : undefined
          }
          className={cn(
            "fixed z-[100] mx-auto flex w-full flex-col overflow-hidden border border-white/10 bg-[#0a0b0a] text-white shadow-[0_-30px_100px_rgba(0,0,0,0.72)] outline-none",
            variant === "credit"
              ? "inset-x-0 bottom-0 max-w-2xl rounded-t-[1.75rem] h-[94dvh] max-h-[94dvh] sm:bottom-4 sm:max-h-[92dvh] sm:rounded-[2rem]"
              : "inset-x-2 bottom-2 w-auto max-w-[calc(100vw-1rem)] rounded-[1.5rem] h-auto max-h-[calc(100dvh-1rem)] sm:inset-x-0 sm:bottom-4 sm:w-full sm:max-w-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.75rem]",
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
