"use client"

import React from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { MiravaMark } from "@/components/mirava/mirava-mark"
import type { MiravaUniverse } from "@/lib/mirava/universes"
import { cn } from "@/lib/utils"

import { GlassSurface } from "@/components/ui/glass-surface"
import { Grainient } from "@/components/ui/grainient"

type Locale = "fr" | "es"

interface MiravaMobileShellProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

export function MiravaMobileShell({ children, className, scrollable = false }: MiravaMobileShellProps) {
  return (
    <div className={cn("mirava-native-mobile-shell relative min-h-dvh max-h-dvh text-[#f1f1ed] isolate overflow-hidden selection:bg-[#d5c6b0] selection:text-[#090a0a]", className)}>
      {/* React Bits Grainient WebGL Shader Ambient Background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-90">
        <Grainient
          color1="#4d4d4d"
          color2="#2d2d2d"
          color3="#cbab96"
          timeSpeed={0.25}
          colorBalance={-0.2}
          warpStrength={1.9}
          warpFrequency={3.9}
          warpSpeed={2.0}
          warpAmplitude={44}
          blendAngle={2}
          blendSoftness={0.25}
          rotationAmount={250}
          noiseScale={2.0}
          grainAmount={0.035}
          grainScale={2.2}
          grainAnimated={false}
          contrast={1.45}
          gamma={0.95}
          saturation={1.25}
          centerX={-0.11}
          centerY={0.04}
          zoom={0.95}
        />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto flex h-dvh max-w-md flex-col px-4 pb-28 pt-28 sm:max-w-xl sm:px-6 sm:pt-32",
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
    <header className="fixed top-3 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-md sm:max-w-xl pointer-events-auto">
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={24}
          brightness={45}
          opacity={0.95}
          blur={14}
          backgroundOpacity={0.15}
          className="w-full p-2.5 px-4 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8)]"
        >
          <div className="w-full">
            {/* 6 Step Nodes / Progress segments */}
            <div className="flex items-center gap-1.5 py-0.5" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={currentStep}>
              {Array.from({ length: totalSteps }).map((_, index) => {
                const isActive = index < currentStep
                return (
                  <div key={index} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
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

            <div className="flex h-8 items-center justify-between pt-1 text-xs">
              {/* Compact Logo Icon */}
              <div className="flex items-center gap-1.5 opacity-90">
                <MiravaMark className="h-4 w-4 text-[#ede8df]" />
              </div>

              {/* Language Badge */}
              <div className="flex items-center">
                <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-jakarta text-[9px] font-bold text-white/70 uppercase">
                  {locale.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </GlassSurface>
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
        "flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-xs leading-relaxed transition-all duration-200 select-none backdrop-blur-xl",
        checked
          ? "border-[#ede8df]/40 bg-white/15 text-[#f1f1ed] shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          : "border-white/10 bg-white/5 text-white/80 hover:border-white/20",
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
        "group relative flex min-h-[76px] w-full items-center justify-between rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 backdrop-blur-xl",
        selected
          ? "border-[#ede8df] bg-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
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
        "group relative flex aspect-[0.82] w-full flex-col justify-end overflow-hidden rounded-[22px] border text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#d5c6b0]",
        selected
          ? "border-[#ede8df] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "border-white/10 hover:border-white/25 shadow-lg"
      )}
    >
      <img
        src={universe.image}
        alt={universe.name[locale]}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105",
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
  onNext,
  nextLabel,
  disabled = false,
}: FloatingActionDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center rounded-[24px] border border-white/10 bg-black/60 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-xl">
        <div className="w-full min-w-0">
          <MiravaPrimaryButton onClick={onNext} disabled={disabled}>
            {nextLabel}
          </MiravaPrimaryButton>
        </div>
      </div>
    </div>
  )
}
