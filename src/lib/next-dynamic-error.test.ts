import { describe, expect, it } from "vitest"
import { isNextDynamicServerError } from "./next-dynamic-error"

describe("Next.js dynamic rendering control flow", () => {
  it("recognizes the internal dynamic-server signal", () => {
    expect(
      isNextDynamicServerError({
        digest: "DYNAMIC_SERVER_USAGE",
      }),
    ).toBe(true)
  })

  it("does not classify ordinary authentication failures as framework signals", () => {
    expect(
      isNextDynamicServerError(
        new Error("Supabase unavailable"),
      ),
    ).toBe(false)

    expect(
      isNextDynamicServerError({
        digest: "OTHER_ERROR",
      }),
    ).toBe(false)
  })
})
