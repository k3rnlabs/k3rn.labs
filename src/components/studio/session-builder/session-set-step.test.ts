import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SET_PRESETS,
} from "@/lib/mirava/session-builder/set-presets"

import {
  SESSION_SET_COPY,
  getMiravaSessionSetSections,
} from "./session-set-step"

describe(
  "MIRAVA Session Builder set step",
  () => {
    it("renders the canonical six physical studio presets without duplicating the catalog", () => {
      const sections =
        getMiravaSessionSetSections(
          "fr",
        )

      const ids =
        sections.flatMap(
          (section) =>
            section.presets.map(
              (preset) =>
                preset.id,
            ),
        )

      expect(
        sections,
      ).toHaveLength(2)

      expect(
        sections[0]
          .category,
      ).toBe(
        "ESSENTIAL",
      )

      expect(
        sections[1]
          .category,
      ).toBe(
        "SIGNATURE",
      )

      expect(ids).toEqual(
        MIRAVA_SET_PRESETS.map(
          (preset) =>
            preset.id,
        ),
      )

      expect(ids).toHaveLength(
        6,
      )
    })

    it("keeps three Essential and three Signature sets", () => {
      const sections =
        getMiravaSessionSetSections(
          "fr",
        )

      expect(
        sections[0]
          .presets,
      ).toHaveLength(3)

      expect(
        sections[1]
          .presets,
      ).toHaveLength(3)
    })

    it("exposes localized FR and ES builder copy", () => {
      const fr =
        getMiravaSessionSetSections(
          "fr",
        )

      const es =
        getMiravaSessionSetSections(
          "es",
        )

      expect(
        SESSION_SET_COPY
          .fr.continue,
      ).toBe(
        "Choisir la lumière",
      )

      expect(
        SESSION_SET_COPY
          .es.continue,
      ).toBe(
        "Elegir la luz",
      )

      expect(
        fr[0]
          .presets[0]
          .name.fr,
      ).toBe(
        "Studio blanc",
      )

      expect(
        es[0]
          .presets[0]
          .name.es,
      ).toBe(
        "Estudio blanco",
      )
    })
  },
)
