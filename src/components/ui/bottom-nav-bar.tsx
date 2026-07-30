"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

const MOBILE_LABEL_WIDTH = 68

export type BottomNavItem = {
  id: string
  label: string
  icon: ReactNode
}

type BottomNavBarProps = {
  activeId: string
  items: BottomNavItem[]
  onValueChange: (id: string) => void
  navigationLabel: string
  className?: string
}

export function BottomNavBar({
  activeId,
  items,
  onValueChange,
  navigationLabel,
  className,
}: BottomNavBarProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.nav
      initial={reduceMotion ? false : { y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
      aria-label={navigationLabel}
      className={cn("mirava-bottom-nav", className)}
    >
      {items.map((item) => {
        const isActive = activeId === item.id

        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => onValueChange(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive}
            className="mirava-bottom-nav-item"
          >
            <span className="mirava-bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <motion.span
              initial={false}
              animate={{
                width: isActive ? MOBILE_LABEL_WIDTH : 0,
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? 8 : 0,
              }}
              transition={reduceMotion ? { duration: 0 } : {
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.16 },
                marginLeft: { duration: 0.16 },
              }}
              className="mirava-bottom-nav-label"
              aria-hidden={!isActive}
            >
              {item.label}
            </motion.span>
          </motion.button>
        )
      })}
    </motion.nav>
  )
}

export default BottomNavBar
