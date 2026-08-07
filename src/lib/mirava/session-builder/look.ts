import { z } from "zod"

export const MIRAVA_SESSION_LOOK_CATEGORIES = [
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
] as const

export type MiravaSessionLookCategory =
  (typeof MIRAVA_SESSION_LOOK_CATEGORIES)[number]

export const MIRAVA_SESSION_LOOK_VIEW_KEYS = [
  "FRONT",
  "BACK",
  "SIDE",
  "DETAIL",
  "PRODUCT",
  "UNKNOWN",
] as const

export type MiravaSessionLookViewKey =
  (typeof MIRAVA_SESSION_LOOK_VIEW_KEYS)[number]

export const MIRAVA_SESSION_LOOK_MAX_ITEMS = 12
export const MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM = 6

export const miravaSessionLookCategorySchema =
  z.enum(
    MIRAVA_SESSION_LOOK_CATEGORIES,
  )

export const miravaSessionLookViewKeySchema =
  z.enum(
    MIRAVA_SESSION_LOOK_VIEW_KEYS,
  )

export const miravaSessionLookUploadedAssetSchema =
  z
    .object({
      path:
        z.string().trim().min(1),
      mimeType:
        z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
        ]),
      bytes:
        z.number().int().positive(),
      viewKey:
        miravaSessionLookViewKeySchema
          .default("UNKNOWN"),
    })
    .strict()

export const miravaSessionLookItemCreateSchema =
  z
    .object({
      category:
        miravaSessionLookCategorySchema,
      label:
        z.string()
          .trim()
          .min(1)
          .max(80)
          .optional(),
      brand:
        z.string()
          .trim()
          .min(1)
          .max(80)
          .optional(),
      description:
        z.string()
          .trim()
          .min(1)
          .max(300)
          .optional(),
      uploads:
        z
          .array(
            miravaSessionLookUploadedAssetSchema,
          )
          .min(1)
          .max(
            MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
          ),
    })
    .strict()

export type MiravaSessionLookItemCreate =
  z.infer<
    typeof miravaSessionLookItemCreateSchema
  >
