"use client"

import type { ReactNode } from "react"

import { useScroll } from "@/components/ui/use-scroll"
import { cn } from "@/lib/utils"

export type AppHeaderStep = {
  label: string
}

type HeaderProps = {
  brand: ReactNode
  actions: ReactNode
  desktopNavigation?: ReactNode
  steps?: AppHeaderStep[]
  activeStep?: number
  furthestStep?: number
  onStepChange?: (step: number) => void
  journeyBack?: ReactNode
  journeyNext?: ReactNode
  stepsLabel?: string
  className?: string
}

export function Header({
  brand,
  actions,
  desktopNavigation,
  steps,
  activeStep = 0,
  furthestStep = activeStep,
  onStepChange,
  journeyBack,
  journeyNext,
  stepsLabel = "Progression",
  className,
}: HeaderProps) {
  const scrolled = useScroll(10)

  return (
    <header data-scrolled={scrolled} className={cn("mirava-app-header", className)}>
      <div className="mirava-app-header-inner mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
        {brand}
        {desktopNavigation}
        {actions}
      </div>

      {steps?.length ? (
        <nav aria-label={stepsLabel} className="mirava-header-journey mx-auto max-w-5xl px-3 pb-3 sm:px-6">
          <div className="mirava-flowbar">
            <div className="mirava-flowbar-back">{journeyBack}</div>
            <ol className="mirava-header-steps">
              {steps.map((step, index) => {
                const complete = index !== activeStep && index <= furthestStep
                const accessible = index <= furthestStep

                return (
                  <li key={step.label} data-active={index === activeStep} className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => accessible && onStepChange?.(index)}
                      disabled={!accessible}
                      aria-label={step.label}
                      aria-current={index === activeStep ? "step" : undefined}
                      data-active={index === activeStep}
                      data-complete={complete}
                      className="mirava-header-step"
                    >
                      <span className="mirava-header-step-number">{complete ? "✓" : `0${index + 1}`}</span>
                      <span className="mirava-header-step-label">{step.label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="mirava-flowbar-next">{journeyNext}</div>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

export default Header
