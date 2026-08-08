import { describe, expect, it } from "vitest"

import {
  resolveMiravaSessionShotVersions,
  type StudioCreationRecord,
} from "./core"

function creation(overrides: Partial<StudioCreationRecord>): StudioCreationRecord {
  return {
    id: "canonical",
    userId: "user-1",
    dossierId: null,
    sessionId: "session-1",
    parentCreationId: null,
    shotIndex: 1,
    shotIntent: "FULL_LENGTH" as StudioCreationRecord["shotIntent"],
    sourceResultIndex: 0,
    creativeOptions: {},
    status: "COMPLETED",
    creativeDirectionSummary: null,
    masterPrompt: "prompt",
    negativePrompt: null,
    failureCode: null,
    failureMessage: null,
    creditReservationKey: "credit",
    createdAt: "2026-08-08T09:00:00.000Z",
    updatedAt: "2026-08-08T09:00:00.000Z",
    completedAt: "2026-08-08T09:01:00.000Z",
    ...overrides,
  }
}

describe("MIRAVA Session Builder canonical shot result resolution", () => {
  it("keeps the canonical slot while an active continuation is pending", () => {
    const canonical = creation({ id: "canonical" })
    const active = creation({ id: "regen-1", parentCreationId: canonical.id, status: "GENERATING", completedAt: null, createdAt: "2026-08-08T09:02:00.000Z" })

    const resolved = resolveMiravaSessionShotVersions(canonical, [active])

    expect(resolved.displayed.id).toBe(canonical.id)
    expect(resolved.active?.id).toBe("regen-1")
  })

  it("replaces a completed slot result with the latest successful continuation", () => {
    const canonical = creation({ id: "canonical" })
    const completed = creation({ id: "pose-1", parentCreationId: canonical.id, status: "COMPLETED", createdAt: "2026-08-08T09:02:00.000Z", completedAt: "2026-08-08T09:03:00.000Z" })

    expect(resolveMiravaSessionShotVersions(canonical, [completed]).displayed.id).toBe("pose-1")
  })

  it("preserves the previous successful result when a continuation fails", () => {
    const canonical = creation({ id: "canonical" })
    const failed = creation({ id: "regen-failed", parentCreationId: canonical.id, status: "FAILED", failureMessage: "provider detail", completedAt: null, createdAt: "2026-08-08T09:02:00.000Z" })

    const resolved = resolveMiravaSessionShotVersions(canonical, [failed])

    expect(resolved.displayed.id).toBe(canonical.id)
    expect(resolved.failedContinuation?.id).toBe("regen-failed")
  })
})
