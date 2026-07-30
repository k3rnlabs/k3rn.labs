import { describe, expect, it } from "vitest"
import { carryableCredits } from "./credits"

describe("MIRAVA credit lot rules", () => {
  it("carries at most one monthly allowance into the next period", () => {
    expect(carryableCredits(0, 20)).toBe(0)
    expect(carryableCredits(11, 20)).toBe(11)
    expect(carryableCredits(49, 20)).toBe(20)
  })

  it("never makes a negative credit balance carryable", () => {
    expect(carryableCredits(-4, 20)).toBe(0)
  })
})
