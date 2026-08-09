import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const worker =
  readFileSync(
    "src/components/studio/mirava-vision.worker.ts",
    "utf8",
  )

const types =
  readFileSync(
    "src/components/studio/mirava-vision.types.ts",
    "utf8",
  )

const emitted =
  readFileSync(
    "public/visual-engine/vision/mirava-vision.worker.js",
    "utf8",
  )

describe(
  "MIRAVA V6.9 artistic-reference face detector",
  () => {
    it(
      "keeps artistic-reference detection separate from Profil identité",
      () => {
        expect(types).toContain(
          '"reference-face"',
        )

        expect(worker).toMatch(
          /mode:\s*\|\s*"face"\s*\|\s*"reference-face"/,
        )

        expect(worker).toContain(
          'mode === "reference-face"',
        )
      },
    )

    it(
      "preserves the strict identity calibration",
      () => {
        expect(worker).toMatch(
          /\?\s*0\.35\s*:\s*0\.62/,
        )

        expect(worker).toMatch(
          /\?\s*0\.35\s*:\s*0\.58/,
        )
      },
    )

    it(
      "keeps multiple-face detection enabled",
      () => {
        expect(worker).toMatch(
          /numFaces:\s*2/,
        )

        expect(worker).toContain(
          '"multiple-faces"',
        )
      },
    )

    it(
      "ships the dedicated mode in the browser worker",
      () => {
        expect(
          emitted.length,
        ).toBeGreaterThan(
          100_000,
        )

        expect(emitted).toContain(
          "reference-face",
        )
      },
    )

  it(
    "uses pose landmarks only as an anatomy-derived fallback when full-frame face localisation fails",
    () => {
      expect(worker).toContain(
        "function analyzeReferenceFace(",
      )

      expect(worker).toContain(
        "function resolveMiravaReferenceHeadCrop(",
      )

      expect(worker).toContain(
        "poseLandmarker",
      )

      expect(worker).toContain(
        "headWidth * 3.4",
      )

      expect(worker).toContain(
        "headHeight * 3.1",
      )

      expect(worker).toContain(
        "shoulderSpan *",
      )

      expect(worker).toContain(
        "canvas.transferToImageBitmap()",
      )

      expect(worker).toContain(
        "crop.left +",
      )

      expect(worker).toContain(
        "crop.top +",
      )
    },
  )

  it(
    "never derives the reference head ROI from a fixed full-frame percentage",
    () => {
      const start =
        worker.indexOf(
          "function resolveMiravaReferenceHeadCrop(",
        )

      const end =
        worker.indexOf(
          "function miravaReferenceGeometryResult(",
          start,
        )

      expect(start).toBeGreaterThan(
        -1,
      )

      expect(end).toBeGreaterThan(
        start,
      )

      const crop =
        worker.slice(
          start,
          end,
        )

      expect(crop).not.toMatch(
        /imageHeight\s*\*\s*0\./,
      )

      expect(crop).not.toMatch(
        /imageWidth\s*\*\s*0\./,
      )
    },
  )


  it(
    "shares one MediaPipe fileset across Face and Pose",
    () => {
      expect(worker).toContain(
        "let visionFileset:",
      )

      expect(worker).toContain(
        "async function getVisionFileset()",
      )

      expect(
        worker.match(
          /FilesetResolver[\s\S]*?forVisionTasks/g,
        )?.length,
      ).toBe(
        1,
      )

      expect(
        worker.match(
          /await getVisionFileset\(\)/g,
        )?.length,
      ).toBeGreaterThanOrEqual(
        2,
      )
    },
  )

  },
)
