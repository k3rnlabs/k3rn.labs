import {
  describe,
  expect,
  it,
} from "vitest"

import {
  KieProviderError,
  parseKieCreateTaskId,
} from "./kie-provider"

describe(
  "MIRAVA Kie createTask response contract",
  () => {
    it(
      "accepts the canonical Kie task id",
      () => {
        expect(
          parseKieCreateTaskId({
            code: 200,
            data: {
              taskId: "task-123",
            },
          }),
        ).toBe(
          "task-123",
        )
      },
    )

    it(
      "does not retry a logical client rejection",
      () => {
        try {
          parseKieCreateTaskId({
            code: 422,
            msg: "invalid input",
          })

          throw new Error(
            "Expected Kie rejection",
          )
        } catch (error) {
          expect(
            error,
          ).toBeInstanceOf(
            KieProviderError,
          )

          const kieError =
            error as KieProviderError

          expect(
            kieError.code,
          ).toBe(
            "KIE_CREATE_REJECTED_422",
          )

          expect(
            kieError.retryable,
          ).toBe(
            false,
          )

          expect(
            kieError.message,
          ).toContain(
            "invalid input",
          )
        }
      },
    )

    it(
      "keeps transient provider failures retryable",
      () => {
        try {
          parseKieCreateTaskId({
            code: 500,
            msg: "temporary failure",
          })

          throw new Error(
            "Expected Kie rejection",
          )
        } catch (error) {
          const kieError =
            error as KieProviderError

          expect(
            kieError.code,
          ).toBe(
            "KIE_CREATE_REJECTED_500",
          )

          expect(
            kieError.retryable,
          ).toBe(
            true,
          )

          expect(
            kieError.kind,
          ).toBe(
            "transport",
          )
        }
      },
    )
  },
)
