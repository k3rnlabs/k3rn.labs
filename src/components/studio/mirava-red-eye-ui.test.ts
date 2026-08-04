import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const worker = readFileSync(
  resolve(
    process.cwd(),
    "src/components/studio/mirava-vision.worker.ts",
  ),
  "utf8",
)

const capture = readFileSync(
  resolve(
    process.cwd(),
    "src/components/studio/mirava-identity-capture.tsx",
  ),
  "utf8",
)

describe("MIRAVA bilateral red-eye calibration", () => {
  it("measures both iris centers without blocking photos", () => {
    expect(worker).toContain(
      "const redEyeMeasurement = measureRedEye(",
    )
    expect(worker).toContain(
      "[469, 470, 471, 472]",
    )
    expect(worker).toContain(
      "[474, 475, 476, 477]",
    )
    expect(worker).toContain(
      "Math.min(left, right)",
    )
    expect(worker).not.toContain(
      'add("red-eye")',
    )

    expect(capture).toContain(
      "redEyeLeft",
    )
    expect(capture).toContain(
      "redEyeRight",
    )
    expect(capture).not.toContain(
      '"Sans flash direct ni yeux rouges"',
    )
  })
})
