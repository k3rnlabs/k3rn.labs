import { describe, expect, it } from "vitest"

import {
  isSessionGalleryTerminal,
  sessionResultDownloadUrl,
  type MiravaSessionGalleryStatus,
} from "./session-gallery"

function session(overrides: Partial<MiravaSessionGalleryStatus> = {}): MiravaSessionGalleryStatus {
  return {
    sessionId: "session-1",
    shotCount: 6,
    completedCount: 6,
    failedCount: 0,
    activeCount: 0,
    status: "COMPLETED",
    studioCredits: 0,
    shots: Array.from({ length: 6 }, (_, shotIndex) => ({
      creationId: `creation-${shotIndex}`,
      shotIndex,
      shotIntent: null,
      status: "COMPLETED",
      resultUrl: `/api/visual-engine/creations/creation-${shotIndex}/result?index=0`,
      failureKind: null,
      failureMessage: null,
      continuationActive: false,
      continuationKind: null,
      continuationFailureMessage: null,
    })),
    ...overrides,
  }
}

describe("MIRAVA Session Gallery", () => {
  it("keeps polling while a regenerate continuation is active after six canonical results", () => {
    const next = session({
      shots: session().shots.map((shot) => shot.shotIndex === 1
        ? { ...shot, continuationActive: true, continuationKind: "REGENERATE" }
        : shot),
    })

    expect(isSessionGalleryTerminal(next)).toBe(false)
    expect(isSessionGalleryTerminal(session())).toBe(true)
  })

  it("keeps polling while a new-pose continuation is active", () => {
    expect(isSessionGalleryTerminal(session({
      shots: session().shots.map((shot) => shot.shotIndex === 1
        ? { ...shot, continuationActive: true, continuationKind: "POSE" }
        : shot),
    }))).toBe(false)
  })

  it("adds the download query whether or not the result already has a query", () => {
    expect(sessionResultDownloadUrl("/api/result")).toBe("/api/result?download=1")
    expect(sessionResultDownloadUrl("/api/result?index=0")).toBe("/api/result?index=0&download=1")
  })

  it("contains localized product copy and never renders raw gallery statuses", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/components/studio/session-builder/session-gallery.tsx", "utf8"))
    expect(source).toContain("CUARTO OSCURO")
    expect(source).toContain("CHAMBRE NOIRE")
    expect(source).toContain("copy.status[session?.status ?? \"QUEUED\"]")
    expect(source).not.toContain("{session?.status ?? \"QUEUED\"}")
  })
})
