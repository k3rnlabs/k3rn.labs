export type MiravaPipelineErrorCode =
  | "REFERENCE_INVALID"
  | "REFERENCE_REJECTED"
  | "EXTRACTION_FAILED"
  | "EXTRACTION_FORMAT_INVALID"
  | "CLASSIFICATION_FAILED"
  | "BLUEPRINT_NOT_PUBLISHED"
  | "IDENTITY_PROFILE_INCOMPLETE"
  | "IDENTITY_IMAGES_MISSING"
  | "PROMPT_COMPILATION_FAILED"
  | "GENERATION_REJECTED"
  | "GENERATION_FAILED"
  | "GENERATION_TIMEOUT"
  | "PIPELINE_CONTRACT_VIOLATION"

export class MiravaPipelineError extends Error {
  readonly code: MiravaPipelineErrorCode
  readonly retryable: boolean

  constructor(message: string, code: MiravaPipelineErrorCode, retryable = false) {
    super(message)
    this.name = "MiravaPipelineError"
    this.code = code
    this.retryable = retryable
  }
}
