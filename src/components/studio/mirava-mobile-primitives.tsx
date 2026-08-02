"use client"

import React from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { MiravaMark } from "@/components/mirava/mirava-mark"
import type { MiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"

type Locale = "fr" | "es"

interface MiravaMobileShellProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

export function MiravaMobileShell({ children, className, scrollable = false }: MiravaMobileShellProps) {
  return (
    <div className={cn("mirava-native-mobile-shell relative min-h-dvh max-h-dvh bg-[#080909] text-[#f1f1ed] isolate overflow-hidden selection:bg-[#d5c6b0] selection:text-[#090a0a]", className)}>
      {/* Unified dark mineral ambient background overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(ellipse_at_50%_110%,rgba(0,0,0,0.85),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_bottom,rgba(15,16,16,0.3)_0%,transparent_30%,rgba(5,6,6,0.6)_100%)]" />

      <div
        className={cn(
          "relative z-10 mx-auto flex h-dvh max-w-md flex-col px-4 pb-28 pt-0 sm:max-w-xl sm:px-6",
          scrollable ? "overflow-y-auto" : "overflow-hidden justify-between"
        )}
      >
        {children}
      </div>
    </div>
  )
}

interface MobileProgressHeaderProps {
  step: number
  totalSteps?: number
  locale?: Locale
  onBack?: () => void
  canGoBack?: boolean
}

export function MobileProgressHeader({
  step,
  totalSteps = 6,
  locale = "fr",
  onBack,
  canGoBack = true,
}: MobileProgressHeaderProps) {
  const currentStep = Math.min(totalSteps, Math.max(1, step + 1))

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-4 rounded-b-2xl border-b border-white/10 bg-[#080909]/92 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
      {/* 6 Step Nodes / Progress segments */}
      <div className="flex items-center gap-1 py-1" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={currentStep}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isActive = index < currentStep
          return (
            <div key={index} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-[#ede8df]"
                initial={{ width: 0 }}
                animate={{ width: isActive ? "100%" : "0%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex h-10 items-center justify-between py-1 text-xs">
        {/* Back Button & Compact Logo Icon (No Brand Text) */}
        <div className="flex items-center gap-2.5">
          {canGoBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/15 active:scale-95 shrink-0"
              aria-label={locale === "fr" ? "Retour" : "Volver"}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="flex items-center gap-1.5 opacity-90">
            <MiravaMark className="h-5 w-5 text-[#ede8df]" />
          </div>
        </div>

        {/* Language Badge Only (No redundant step number text) */}
        <div className="flex items-center">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-jakarta text-[9px] font-bold text-white/70 uppercase">
            {locale.toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}

interface SelectionIndicatorProps {
  selected: boolean
  className?: string
}

export function SelectionIndicator({ selected, className }: SelectionIndicatorProps) {
  return (
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200",
        selected
          ? "border-[#ede8df] bg-[#ede8df] text-[#0d0e0e] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          : "border-white/20 bg-black/40 text-transparent backdrop-blur-sm hover:border-white/50",
        className
      )}
    >
      <Check className={cn("h-3.5 w-3.5 stroke-[3] transition-transform duration-200", selected ? "scale-100" : "scale-0")} />
    </div>
  )
}

interface MiravaCustomCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  className?: string
}

export function MiravaCustomCheckbox({ checked, onChange, label, className }: MiravaCustomCheckboxProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        "flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-xs leading-relaxed transition-all duration-200 select-none",
        checked
          ? "border-[#ede8df]/40 bg-[#141516] text-[#f1f1ed] shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          : "border-white/10 bg-black/40 text-white/80 hover:border-white/20",
        className
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          onChange(!checked)
        }}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ede8df] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          checked
            ? "border-[#ede8df] bg-[#ede8df] text-[#0d0e0e] shadow-[0_2px_8px_rgba(237,232,223,0.3)]"
            : "border-white/30 bg-black/60 text-transparent hover:border-white/50"
        )}
      >
        <Check className={cn("h-3.5 w-3.5 stroke-[3] transition-transform duration-150", checked ? "scale-100" : "scale-0")} />
      </button>
      <span className="flex-1 min-w-0">{label}</span>
    </div>
  )
}

interface MiravaSelectionCardProps {
  title: string
  subtitle: string
  selected: boolean
  onClick: () => void
}

export function MiravaSelectionCard({ title, subtitle, selected, onClick }: MiravaSelectionCardProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex min-h-[76px] w-full items-center justify-between rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200",
        selected
          ? "border-[#ede8df] bg-[#1a1c1d] shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          : "border-white/10 bg-[#121314]/80 hover:border-white/25 hover:bg-[#161819]"
      )}
    >
      <div className="min-w-0 flex-1 pr-3">
        <strong className="block font-jakarta text-base font-semibold text-white leading-snug">
          {title}
        </strong>
        <span className="mt-1.5 block font-jakarta text-xs leading-relaxed text-white/70">
          {subtitle}
        </span>
      </div>
      <SelectionIndicator selected={selected} className="self-center shrink-0" />
    </motion.button>
  )
}

interface UniverseCardProps {
  universe: MiravaUniverse
  selected: boolean
  locale: Locale
  onToggle: () => void
}

export function UniverseCard({ universe, selected, locale, onToggle }: UniverseCardProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group relative flex aspect-[0.88] w-full flex-col justify-end overflow-hidden rounded-[22px] border text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#d5c6b0]",
        selected
          ? "border-[#ede8df] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "border-white/10 hover:border-white/25 shadow-lg"
      )}
    >
      <img
        src={universe.image}
        alt={universe.name[locale]}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105",
          selected ? "scale-105 saturate-[1.05] brightness-[0.95]" : "saturate-[0.8] brightness-[0.85]"
        )}
      />

      <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      <div className="absolute right-3 top-3 z-10">
        <SelectionIndicator selected={selected} />
      </div>

      <div className="relative z-10 p-3.5 sm:p-4">
        <span className="mb-1 block font-jakarta text-[9px] font-bold tracking-[0.14em] text-white/70 uppercase">
          {universe.eyebrow[locale]}
        </span>
        <strong className="block font-jakarta text-sm font-semibold leading-tight text-white sm:text-base">
          {universe.name[locale]}
        </strong>
      </div>
    </motion.button>
  )
}

interface UniverseGridProps {
  children: React.ReactNode
  className?: string
}

export function UniverseGrid({ children, className }: UniverseGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", className)}>
      {children}
    </div>
  )
}

interface MiravaPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  icon?: React.ReactNode
}

export function MiravaPrimaryButton({ children, icon, className, disabled, ...props }: MiravaPrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "group flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-5 font-jakarta text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
        disabled
          ? "cursor-not-allowed bg-[#2c2d2e] text-white/30 shadow-none opacity-60"
          : "bg-[#ede8df] text-[#0d0e0e] hover:bg-white shadow-[0_4px_20px_rgba(237,232,223,0.15)]",
        className
      )}
    >
      <span>{children}</span>
      {icon ?? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  )
}

interface MiravaSecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  icon?: React.ReactNode
}

export function MiravaSecondaryButton({ children, icon, className, disabled, ...props }: MiravaSecondaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 font-jakarta text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]",
        disabled && "cursor-not-allowed opacity-40",
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

interface FloatingActionDockProps {
  onBack?: () => void
  onNext: () => void
  nextLabel: string
  disabled?: boolean
  canGoBack?: boolean
}

export function FloatingActionDock({
  onBack,
  onNext,
  nextLabel,
  disabled = false,
  canGoBack = true,
}: FloatingActionDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center gap-2.5 rounded-[24px] border border-white/10 bg-[#121314]/85 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-xl">
        {canGoBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <MiravaPrimaryButton onClick={onNext} disabled={disabled}>
            {nextLabel}
          </MiravaPrimaryButton>
        </div>
      </div>
    </div>
  )
}
