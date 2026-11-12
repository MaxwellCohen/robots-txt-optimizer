/** Shared base for fetch-related errors: a stable `code` plus optional `cause`. */
export abstract class RobotsToolError<Code extends string> extends Error {
  readonly code: Code

  constructor(message: string, code: Code, options?: ErrorOptions) {
    super(message, options)
    this.code = code
  }
}

export type RobotsUrlErrorCode = 'MISSING_URL' | 'INVALID_URL' | 'UNSUPPORTED_PROTOCOL'

export class RobotsUrlError extends RobotsToolError<RobotsUrlErrorCode> {
  constructor(message: string, code: RobotsUrlErrorCode, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'RobotsUrlError'
  }
}

export type RobotsFetchSecurityErrorCode
  = | 'LOCAL_HOST'
    | 'PRIVATE_IP'
    | 'PRIVATE_DNS'
    | 'UNSAFE_REDIRECT'

export class RobotsFetchSecurityError extends RobotsToolError<RobotsFetchSecurityErrorCode> {
  constructor(message: string, code: RobotsFetchSecurityErrorCode, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'RobotsFetchSecurityError'
  }
}

export type RobotsFetchErrorCode = 'TIMEOUT' | 'TOO_LARGE' | 'TOO_MANY_REDIRECTS'

export class RobotsFetchError extends RobotsToolError<RobotsFetchErrorCode> {
  constructor(message: string, code: RobotsFetchErrorCode, options?: ErrorOptions) {
    super(message, code, options)
    this.name = 'RobotsFetchError'
  }
}
