import {
  z,
} from "zod"

import {
  miravaSessionLookCategorySchema,
} from "./look"

export const miravaSessionLookItemUpdateSchema =
  z
    .object({
      category:
        miravaSessionLookCategorySchema
          .optional(),
      label:
        z.string()
          .trim()
          .min(1)
          .max(80)
          .nullable()
          .optional(),
      brand:
        z.string()
          .trim()
          .min(1)
          .max(80)
          .nullable()
          .optional(),
      description:
        z.string()
          .trim()
          .min(1)
          .max(300)
          .nullable()
          .optional(),
    })
    .strict()
    .refine(
      (value) =>
        Object.keys(
          value,
        ).length > 0,
      {
        message:
          "At least one look item field must be updated.",
      },
    )

export type MiravaSessionLookItemUpdate =
  z.infer<
    typeof miravaSessionLookItemUpdateSchema
  >
