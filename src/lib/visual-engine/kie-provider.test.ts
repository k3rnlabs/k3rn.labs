import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"
import {
  buildKieImageTaskInput,
  buildMiravaKieReferencePrompt,
  parseKieUploadUrl,
  shouldRouteMiravaPromptToKie,
} from "./kie-provider"

describe(
  "MIRAVA Kie image provider contracts",
  () => {
    it(
      "routes explicit intimate-fashion categories without over-routing ordinary fashion",
      () => {
        expect(
          shouldRouteMiravaPromptToKie(
            "Premium commercial lingerie campaign.",
          ),
        ).toBe(true)

        expect(
          shouldRouteMiravaPromptToKie(
            "Premium business portrait in a tailored blazer.",
          ),
        ).toBe(false)
      },
    )

    it(
      "builds the documented Seedream 4.5 multi-image payload with safety enabled",
      () => {
        const input =
          buildKieImageTaskInput({
            model:
              "seedream/4.5-edit",
            prompt:
              "Commercial fashion image.",
            inputUrls: [
              "https://example.com/reference.webp",
              "https://example.com/identity.webp",
            ],
          })

        expect(input).toMatchObject({
          prompt:
            "Commercial fashion image.",
          image_urls: [
            "https://example.com/reference.webp",
            "https://example.com/identity.webp",
          ],
          aspect_ratio:
            "2:3",
          quality:
            "basic",
          nsfw_checker:
            true,
        })

        expect(
          "input_urls" in input,
        ).toBe(false)
      },
    )

    it(
      "keeps art direction and identity roles separated",
      () => {
        const prompt =
          buildMiravaKieReferencePrompt({
            prompt:
              "Create the approved fashion frame.",
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
          })

        expect(prompt).toContain(
          "ART DIRECTION ONLY",
        )
        expect(prompt).toContain(
          "Never use this image as an identity source",
        )
        expect(prompt).toContain(
          "IDENTITY AUTHORITY",
        )
        expect(prompt).toContain(
          "sole authority for the generated person's identity",
        )
      },
    )

    it(
      "keeps provider safety checking enabled for every supported image model",
      () => {
        const seedream =
          buildKieImageTaskInput({
            model:
              "seedream/4.5-edit",
            prompt:
              "Commercial fashion image.",
            inputUrls: [
              "https://example.com/reference.webp",
            ],
          })

        const flux =
          buildKieImageTaskInput({
            model:
              "flux-2/pro-image-to-image",
            prompt:
              "Commercial fashion image.",
            inputUrls: [
              "https://example.com/reference.webp",
            ],
          })

        expect(
          seedream.nsfw_checker,
        ).toBe(true)

        expect(
          flux.nsfw_checker,
        ).toBe(true)
      },
    )

    it(
      "supports resumable asynchronous tasks",
      () => {
        const source =
          readFileSync(
            "src/lib/visual-engine/kie-provider.ts",
            "utf8",
          )

        expect(source).toContain(
          "resumeTaskId",
        )
        expect(source).toContain(
          "onTaskCreated",
        )
        expect(source).toContain(
          "/jobs/recordInfo",
        )
      },
    )
  },
)


describe(
  "Kie upload response",
  () => {
    it(
      "treats Kie free upload quota as non-retryable",
      () => {
        try {
          parseKieUploadUrl({
            success: false,
            code: 401,
            msg:
              "Authentication failed: Free users can upload up to 30 files within 30 days",
          })

          throw new Error(
            "Expected quota error",
          )
        } catch (error) {
          expect(error).toMatchObject({
            code:
              "KIE_UPLOAD_QUOTA",
            kind:
              "billing",
            retryable:
              false,
          })
        }
      },
    )

    it(
      "accepts a successful Kie upload URL",
      () => {
        expect(
          parseKieUploadUrl({
            success: true,
            code: 200,
            data: {
              downloadUrl:
                "https://example.test/input.png",
            },
          }),
        ).toBe(
          "https://example.test/input.png",
        )
      },
    )
  },
)
