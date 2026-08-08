import { describe, expect, it } from "vitest"

import {
  selectMiravaCustomLookProviderReferences,
  selectMiravaReferenceLookProviderReferences,
  buildMiravaSessionProviderImageInputs,
} from "./provider-visual-references"

const createdAt = "2026-08-08T09:00:00.000Z"

describe("MIRAVA Session Builder provider visual references", () => {
  it("selects deterministic wardrobe storage paths with useful views first", () => {
    const selected = selectMiravaCustomLookProviderReferences({
      lookItems: [
        { position: 1, assets: [
          { id: "dress-back", storagePath: "look/dress-back.webp", mimeType: "image/webp", viewKey: "BACK", createdAt },
          { id: "dress-front", storagePath: "look/dress-front.webp", mimeType: "image/webp", viewKey: "FRONT", createdAt },
        ] },
        { position: 0, assets: [
          { id: "bag-detail", storagePath: "look/bag-detail.webp", mimeType: "image/webp", viewKey: "DETAIL", createdAt },
          { id: "bag-product", storagePath: "look/bag-product.webp", mimeType: "image/webp", viewKey: "PRODUCT", createdAt },
        ] },
      ],
    })

    expect(selected).toEqual([
      expect.objectContaining({ id: "bag-product", storagePath: "look/bag-product.webp", role: "WARDROBE" }),
      expect.objectContaining({ id: "dress-front", storagePath: "look/dress-front.webp", role: "WARDROBE" }),
      expect.objectContaining({ id: "bag-detail", storagePath: "look/bag-detail.webp", role: "WARDROBE" }),
      expect.objectContaining({ id: "dress-back", storagePath: "look/dress-back.webp", role: "WARDROBE" }),
    ])
  })

  it("passes the durable artistic reference as art direction, never identity", () => {
    const references = selectMiravaReferenceLookProviderReferences({
      assets: [{ id: "reference-asset", storagePath: "references/look.webp", mimeType: "image/webp", viewKey: "FRONT", createdAt }],
    })
    expect(references).toEqual([
      expect.objectContaining({ id: "reference-asset", storagePath: "references/look.webp", role: "ART_DIRECTION" }),
    ])
    expect(buildMiravaSessionProviderImageInputs(references)).toEqual([
      expect.objectContaining({ id: "reference-asset", storagePath: "references/look.webp", fileName: "art-direction-reference-asset", role: "ART_DIRECTION" }),
    ])
  })
})
