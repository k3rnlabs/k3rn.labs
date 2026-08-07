import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_LOOK_CATEGORIES,
  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
  MIRAVA_SESSION_LOOK_VIEW_KEYS,
  miravaSessionLookItemCreateSchema,
} from "./look"

describe(
  "MIRAVA Session Builder look contract",
  () => {
    it("exposes stable V1 categories and multi-view keys", () => {
      expect(
        MIRAVA_SESSION_LOOK_CATEGORIES,
      ).toEqual([
        "TOP",
        "BOTTOM",
        "DRESS",
        "OUTERWEAR",
        "SHOES",
        "BAG",
        "WATCH",
        "JEWELRY",
        "EYEWEAR",
        "OTHER",
      ])

      expect(
        MIRAVA_SESSION_LOOK_VIEW_KEYS,
      ).toEqual([
        "FRONT",
        "BACK",
        "SIDE",
        "DETAIL",
        "PRODUCT",
        "UNKNOWN",
      ])
    })

    it("groups several photographs into one wardrobe item", () => {
      const parsed =
        miravaSessionLookItemCreateSchema
          .parse({
            category:
              "OUTERWEAR",
            label:
              "Leather jacket",
            uploads: [
              {
                path:
                  "user/session-look/a/front.jpg",
                mimeType:
                  "image/jpeg",
                bytes:
                  1000,
                viewKey:
                  "FRONT",
              },
              {
                path:
                  "user/session-look/a/back.jpg",
                mimeType:
                  "image/jpeg",
                bytes:
                  1200,
                viewKey:
                  "BACK",
              },
            ],
          })

      expect(
        parsed.uploads,
      ).toHaveLength(2)

      expect(
        parsed.uploads.map(
          (asset) =>
            asset.viewKey,
        ),
      ).toEqual([
        "FRONT",
        "BACK",
      ])
    })

    it("rejects unsupported categories, formats and oversized asset groups", () => {
      expect(
        miravaSessionLookItemCreateSchema.safeParse({
          category:
            "SWIM",
          uploads: [
            {
              path:
                "a.jpg",
              mimeType:
                "image/jpeg",
              bytes:
                100,
            },
          ],
        }).success,
      ).toBe(false)

      expect(
        miravaSessionLookItemCreateSchema.safeParse({
          category:
            "TOP",
          uploads: [
            {
              path:
                "a.gif",
              mimeType:
                "image/gif",
              bytes:
                100,
            },
          ],
        }).success,
      ).toBe(false)

      expect(
        miravaSessionLookItemCreateSchema.safeParse({
          category:
            "TOP",
          uploads:
            Array.from(
              {
                length:
                  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM +
                  1,
              },
              (_, index) => ({
                path:
                  `asset-${index}.jpg`,
                mimeType:
                  "image/jpeg",
                bytes:
                  100,
              }),
            ),
        }).success,
      ).toBe(false)
    })
  },
)
