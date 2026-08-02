import { describe, expect, it } from "vitest"
import { miravaApiError, miravaApiSuccess } from "./http"

describe("MIRAVA private API responses", () => {
  it("prevents browsers and intermediaries from storing account data", () => {
    const response = miravaApiSuccess({ profile: { id: "private-profile" } })

    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("Pragma")).toBe("no-cache")
    expect(response.headers.get("Vary")).toBe("Cookie")
  })

  it("keeps authentication and validation errors private too", () => {
    const response = miravaApiError("Unauthorized", 401)

    expect(response.status).toBe(401)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
  })
})
