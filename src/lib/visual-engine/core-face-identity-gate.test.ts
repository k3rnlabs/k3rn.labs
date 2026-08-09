import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA provider-independent face identity gate",
  () => {
    it(
      "gates the common candidate after every provider route",
      () => {
        const candidate =
          core.indexOf(
            "async function generateStudioImageCandidate(",
          )
        const gate =
          core.indexOf(
            "async function generateStudioImage(",
            candidate + 1,
          )
        const worker =
          core.indexOf(
            "const output = await generateStudioImage(",
          )

        expect(candidate)
          .toBeGreaterThan(-1)
        expect(gate)
          .toBeGreaterThan(candidate)
        expect(worker)
          .toBeGreaterThan(gate)
        expect(
          core.slice(
            gate,
            worker,
          ),
        ).toContain(
          "evaluateMiravaFaceIdentity({",
        )
      },
    )

    it(
      "fails closed in required mode",
      () => {
        expect(core).toContain(
          'gateMode === "required"',
        )
        expect(core).toContain(
          'gateResult.decision !== "PASS"',
        )
        expect(core).toContain(
          '"IDENTITY_FIDELITY_REJECTED"',
        )
        expect(core).toContain(
          '"IDENTITY_FIDELITY_UNSCORABLE"',
        )
      },
    )

    it(
      "uses the canonical profile views and a versioned manifest",
      () => {
        expect(core).toContain(
          "selectMiravaKieRequiredIdentityFaceInputs(",
        )
        expect(core).toContain(
          "miravaIdentityManifestVersion(",
        )
        expect(core).toContain(
          "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS.length",
        )
      },
    )
  },
)
