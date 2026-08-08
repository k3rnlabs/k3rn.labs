import { describe, expect, it } from "vitest"
import {
  carryableCredits,
  MIRAVA_ACTIVATION_CREDITS,
} from "./credits"

describe("MIRAVA credit lot rules", () => {
  it("carries at most one monthly allowance into the next period", () => {
    expect(carryableCredits(0, 20)).toBe(0)
    expect(carryableCredits(11, 20)).toBe(11)
    expect(carryableCredits(49, 20)).toBe(20)
  })

  it("never makes a negative credit balance carryable", () => {
    expect(carryableCredits(-4, 20)).toBe(0)
  })

  it("grants two onboarding credits so the automatic image leaves one free creation", () => {
    expect(
      MIRAVA_ACTIVATION_CREDITS,
    ).toBe(2)
    expect(
      MIRAVA_ACTIVATION_CREDITS -
        1,
    ).toBe(1)
  })
})
