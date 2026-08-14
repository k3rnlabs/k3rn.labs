import type {
  MiravaSetPresetId,
} from "./set-presets"

import type {
  MiravaLightingPresetId,
} from "./lighting-presets"

export const MIRAVA_STUDIO_VISUAL_ASSET_ROOT =
  "/visual-engine/session-builder" as const

export const MIRAVA_SET_VISUAL_ASSETS:
  Readonly<
    Record<
      MiravaSetPresetId,
      {
        previewPath: string
        fileName: string
      }
    >
  > = {
    "white-cyclorama-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/white-cyclorama-v1.webp",
      fileName:
        "white-cyclorama-v1.webp",
    },
    "grey-cyclorama-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/grey-cyclorama-v1.webp",
      fileName:
        "grey-cyclorama-v1.webp",
    },
    "black-cyclorama-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/black-cyclorama-v1.webp",
      fileName:
        "black-cyclorama-v1.webp",
    },
    "pro-fashion-studio-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/pro-fashion-studio-v1.webp",
      fileName:
        "pro-fashion-studio-v1.webp",
    },
    "editorial-studio-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/editorial-studio-v1.webp",
      fileName:
        "editorial-studio-v1.webp",
    },
    "daylight-studio-v1": {
      previewPath:
        "/visual-engine/session-builder/sets/daylight-studio-v1.webp",
      fileName:
        "daylight-studio-v1.webp",
    },
  }

export const MIRAVA_LIGHTING_VISUAL_ASSETS:
  Readonly<
    Record<
      MiravaLightingPresetId,
      {
        previewPath: string
        fileName: string
      }
    >
  > = {
    "soft-v1": {
      previewPath:
        "/visual-engine/session-builder/lighting/soft-v1.webp",
      fileName:
        "soft-v1.webp",
    },
    "clean-v1": {
      previewPath:
        "/visual-engine/session-builder/lighting/clean-v1.webp",
      fileName:
        "clean-v1.webp",
    },
    "direct-flash-v1": {
      previewPath:
        "/visual-engine/session-builder/lighting/direct-flash-v1.webp",
      fileName:
        "direct-flash-v1.webp",
    },
    "dramatic-v1": {
      previewPath:
        "/visual-engine/session-builder/lighting/dramatic-v1.webp",
      fileName:
        "dramatic-v1.webp",
    },
  }

export const MIRAVA_SET_PREVIEW_IMAGES:
  Readonly<
    Record<
      MiravaSetPresetId,
      string
    >
  > = {
    "white-cyclorama-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "white-cyclorama-v1"
      ].previewPath,
    "grey-cyclorama-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "grey-cyclorama-v1"
      ].previewPath,
    "black-cyclorama-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "black-cyclorama-v1"
      ].previewPath,
    "pro-fashion-studio-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "pro-fashion-studio-v1"
      ].previewPath,
    "editorial-studio-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "editorial-studio-v1"
      ].previewPath,
    "daylight-studio-v1":
      MIRAVA_SET_VISUAL_ASSETS[
        "daylight-studio-v1"
      ].previewPath,
  }

export const MIRAVA_LIGHTING_PREVIEW_IMAGES:
  Readonly<
    Record<
      MiravaLightingPresetId,
      string
    >
  > = {
    "soft-v1":
      MIRAVA_LIGHTING_VISUAL_ASSETS[
        "soft-v1"
      ].previewPath,
    "clean-v1":
      MIRAVA_LIGHTING_VISUAL_ASSETS[
        "clean-v1"
      ].previewPath,
    "direct-flash-v1":
      MIRAVA_LIGHTING_VISUAL_ASSETS[
        "direct-flash-v1"
      ].previewPath,
    "dramatic-v1":
      MIRAVA_LIGHTING_VISUAL_ASSETS[
        "dramatic-v1"
      ].previewPath,
  }

export function getMiravaSetVisualAsset(
  presetId: MiravaSetPresetId,
) {
  return MIRAVA_SET_VISUAL_ASSETS[
    presetId
  ]
}

export function getMiravaLightingVisualAsset(
  presetId: MiravaLightingPresetId,
) {
  return MIRAVA_LIGHTING_VISUAL_ASSETS[
    presetId
  ]
}
