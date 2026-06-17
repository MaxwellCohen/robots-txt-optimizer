export type RobotsUrlErrorCode = 'MISSING_URL' | 'INVALID_URL' | 'UNSUPPORTED_PROTOCOL'

export class RobotsUrlError extends Error {
  readonly code: RobotsUrlErrorCode

  constructor(message: string, code: RobotsUrlErrorCode) {
    super(message)
    this.name = 'RobotsUrlError'
    this.code = code
  }
}

export type RobotsFetchSecurityErrorCode
  = | 'LOCAL_HOST'
    | 'PRIVATE_IP'
    | 'PRIVATE_DNS'

export class RobotsFetchSecurityError extends Error {
  readonly code: RobotsFetchSecurityErrorCode

  constructor(message: string, code: RobotsFetchSecurityErrorCode) {
    super(message)
    this.name = 'RobotsFetchSecurityError'
    this.code = code
  }
}

export type RobotsFetchErrorCode = 'TIMEOUT' | 'TOO_LARGE'

export class RobotsFetchError extends Error {
  readonly code: RobotsFetchErrorCode

  constructor(message: string, code: RobotsFetchErrorCode) {
    super(message)
    this.name = 'RobotsFetchError'
    this.code = code
  }
}
