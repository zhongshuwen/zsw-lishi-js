export type ErrorData = {
  code: string
  trace_id?: string
  message: string
  details?: { [key: string]: any }
}

export class ZswLishiError extends Error {
  public description: string
  public cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)

    this.description = message
    this.cause = cause
  }
}

export class ZswLishiApiError extends ZswLishiError implements ErrorData {
  public code: string
  public trace_id?: string
  public message: string
  public details?: { [key: string]: any }

  constructor(data: ErrorData, cause?: Error) {
    super(data.message, cause)

    this.code = data.code
    this.trace_id = data.trace_id
    this.message = data.message
    this.details = data.details
  }
}

// ZswLishiGenericApiError represents API requests error for calls that are proxyed to external entities
// like `zswchain` or does not respect standard 中数文历史 API error format.
export class ZswLishiGenericApiError extends ZswLishiError {
  public code: number
  public data: unknown
  public body: string
  public headers: any

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(code: number, body: string, data: unknown, headers?: any, cause?: Error) {
    let message = "Failed to execute API call"
    if (data && typeof data === "object" && (data as any).message) {
      message = (data as any).message
    }

    super(message, cause)

    this.code = code
    this.data = data
    this.body = body
    this.headers = headers
  }
}

export class ZswLishiClientError extends ZswLishiError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
  }
}

export class ZswLishiSocketError extends ZswLishiError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
  }
}
