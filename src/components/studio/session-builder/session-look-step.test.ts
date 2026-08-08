import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_LOOK_CATEGORIES,
  MIRAVA_SESSION_LOOK_VIEW_KEYS,
} from "@/lib/mirava/session-builder/look"

import {
  SESSION_LOOK_CATEGORY_LABELS,
  SESSION_LOOK_COPY,
  SESSION_LOOK_VIEW_LABELS,
  canContinueMiravaSessionLook,
} from "./session-look-step"

describe(
  "MIRAVA Session Builder look step",
  () => {
    it("labels every canonical look category in FR and ES", () => {
      for (
        const category
        of MIRAVA_SESSION_LOOK_CATEGORIES
      ) {
        expect(
          SESSION_LOOK_CATEGORY_LABELS
            .fr[
            category
          ],
        ).toBeTruthy()

        expect(
          SESSION_LOOK_CATEGORY_LABELS
            .es[
            category
          ],
        ).toBeTruthy()
      }
    })

    it("labels every canonical multi-view key in FR and ES", () => {
      for (
        const viewKey
        of MIRAVA_SESSION_LOOK_VIEW_KEYS
      ) {
        expect(
          SESSION_LOOK_VIEW_LABELS
            .fr[
            viewKey
          ],
        ).toBeTruthy()

        expect(
          SESSION_LOOK_VIEW_LABELS
            .es[
            viewKey
          ],
        ).toBeTruthy()
      }
    })

    it("allows reference mode without a persisted custom item", () => {
      expect(
        canContinueMiravaSessionLook(
          {
            lookMode:
              "REFERENCE",
            lookItems: [],
          },
        ),
      ).toBe(true)
    })

    it("requires a persisted asset for custom mode", () => {
      expect(
        canContinueMiravaSessionLook(
          {
            lookMode:
              "CUSTOM",
            lookItems: [],
          },
        ),
      ).toBe(false)

      expect(
        canContinueMiravaSessionLook(
          {
            lookMode:
              "CUSTOM",
            lookItems: [
              {
                id:
                  "look-1",
                category:
                  "TOP",
                label:
                  "Blazer",
                brand:
                  null,
                description:
                  null,
                position:
                  0,
                assets: [
                  {
                    mimeType:
                      "image/jpeg",
                    bytes:
                      1234,
                    viewKey:
                      "FRONT",
                  },
                ],
              },
            ],
          },
        ),
      ).toBe(true)
    })

    it("allows a resumed custom look when the server already persisted an asset", () => {
      expect(
        canContinueMiravaSessionLook(
          {
            lookMode:
              "CUSTOM",
            lookItems: [],
            persistedCustomLookReady:
              true,
          },
        ),
      ).toBe(true)
    })

    it("exposes localized navigation copy", () => {
      expect(
        SESSION_LOOK_COPY
          .fr.continue,
      ).toBe(
        "Voir ma séance",
      )

      expect(
        SESSION_LOOK_COPY
          .es.continue,
      ).toBe(
        "Ver mi sesión",
      )
    })
  },
)
