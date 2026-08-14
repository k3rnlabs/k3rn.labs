import {
  describe,
  expect,
  it,
} from "vitest"

import {
  parseKieResponsesText,
} from "./kie-provider"

describe(
  "MIRAVA KIE analysis provider",
  () => {
    it(
      "extracts output_text from a Responses payload",
      () => {
        expect(
          parseKieResponsesText(
            JSON.stringify({
              output: [
                {
                  type:
                    "message",
                  content: [
                    {
                      type:
                        "output_text",
                      text:
                        '{"ok":true}',
                    },
                  ],
                },
              ],
              credits_consumed:
                0.48,
            }),
          ),
        ).toBe(
          '{"ok":true}',
        )
      },
    )

    it(
      "rejects unrelated JSON as empty output",
      () => {
        expect(
          parseKieResponsesText(
            '{"status":"completed"}',
          ),
        ).toBe("")
      },
    )
  },
)
