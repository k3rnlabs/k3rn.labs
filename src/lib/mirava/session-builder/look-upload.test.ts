import {
  describe,
  expect,
  it,
} from "vitest"

import {
  extensionForMiravaLookMimeType,
  isMiravaLookStagedPathForBatch,
  isMiravaLookUploadBatchId,
  miravaLookStagingPrefix,
  parseMiravaLookUploadFiles,
} from "./look-upload"

describe(
  "MIRAVA Session Builder look upload",
  () => {
    it("accepts one to six supported private images", () => {
      expect(
        parseMiravaLookUploadFiles(
          [
            {
              mimeType:
                "image/jpeg",
              bytes:
                1024,
            },
            {
              mimeType:
                "image/webp",
              bytes:
                2048,
            },
          ],
          10_000,
        ),
      ).toEqual([
        {
          mimeType:
            "image/jpeg",
          bytes:
            1024,
        },
        {
          mimeType:
            "image/webp",
          bytes:
            2048,
        },
      ])

      expect(
        parseMiravaLookUploadFiles(
          Array.from(
            {
              length: 7,
            },
            () => ({
              mimeType:
                "image/jpeg",
              bytes:
                100,
            }),
          ),
          10_000,
        ),
      ).toBeNull()
    })

    it("rejects unsupported formats and invalid sizes", () => {
      expect(
        parseMiravaLookUploadFiles(
          [
            {
              mimeType:
                "image/gif",
              bytes:
                100,
            },
          ],
          10_000,
        ),
      ).toBeNull()

      expect(
        parseMiravaLookUploadFiles(
          [
            {
              mimeType:
                "image/jpeg",
              bytes:
                10_001,
            },
          ],
          10_000,
        ),
      ).toBeNull()
    })

    it("creates deterministic user/session/batch staging prefixes", () => {
      expect(
        miravaLookStagingPrefix(
          "user-1",
          "session-1",
          "batch-1",
        ),
      ).toBe(
        "user-1/session-look-staging/session-1/batch-1/",
      )

      expect(
        extensionForMiravaLookMimeType(
          "image/jpeg",
        ),
      ).toBe("jpg")

      expect(
        extensionForMiravaLookMimeType(
          "image/png",
        ),
      ).toBe("png")
    })

    it("only accepts paths inside the exact upload batch", () => {
      const args = {
        userId:
          "user-1",
        sessionId:
          "session-1",
        batchId:
          "3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7",
      }

      expect(
        isMiravaLookStagedPathForBatch(
          "user-1/session-look-staging/session-1/3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7/photo.jpg",
          args,
        ),
      ).toBe(true)

      expect(
        isMiravaLookStagedPathForBatch(
          "other-user/session-look-staging/session-1/3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7/photo.jpg",
          args,
        ),
      ).toBe(false)

      expect(
        isMiravaLookStagedPathForBatch(
          "user-1/session-look-staging/session-1/3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7/nested/photo.jpg",
          args,
        ),
      ).toBe(false)

      expect(
        isMiravaLookUploadBatchId(
          args.batchId,
        ),
      ).toBe(true)

      expect(
        isMiravaLookUploadBatchId(
          "batch-1",
        ),
      ).toBe(false)
    })
  },
)
