export const MIRAVA_USER_REFERENCE_RUNTIME_VERSION =
  "1.1.0"

export const MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS =
  760


function compactMiravaUserReferenceSummary(
  value: string,
): string {
  const normalized =
    value
      .replace(
        /\s+/g,
        " ",
      )
      .trim()

  if (
    normalized.length <=
    MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS
  ) {
    return normalized
  }

  const sliced =
    normalized.slice(
      0,
      MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS,
    )

  const sentenceBoundary =
    sliced.lastIndexOf(
      ". ",
    )

  if (
    sentenceBoundary >=
    MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS *
      0.65
  ) {
    return sliced
      .slice(
        0,
        sentenceBoundary + 1,
      )
      .trim()
  }

  return sliced
    .replace(
      /\s+\S*$/,
      "",
    )
    .trim()
}


export function resolveMiravaUserReferenceRuntimePrompt(
  creativeDirectionSummary:
    string | null | undefined,
): string | null {
  const summary =
    creativeDirectionSummary
      ?.trim()

  if (!summary) {
    return null
  }

  return [
    `USER REFERENCE VISUAL DNA v${MIRAVA_USER_REFERENCE_RUNTIME_VERSION} —`,
    compactMiravaUserReferenceSummary(
      summary,
    ),
  ].join(
    "\n\n",
  )
}
