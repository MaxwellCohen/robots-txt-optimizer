import {
  RobotsFetchError,
  RobotsFetchSecurityError,
  RobotsUrlError
} from '@robots-txt-optimizer/core/fetch'
import { createError } from 'nuxt/server'

/** Maps robots engine errors to HTTP errors; rethrows anything else. */
export function toHttpError(err: unknown): never {
  if (err instanceof RobotsUrlError) {
    throw createError({ statusCode: 400, message: err.message })
  }
  if (err instanceof RobotsFetchSecurityError) {
    throw createError({ statusCode: 403, message: err.message })
  }
  if (err instanceof RobotsFetchError) {
    const statusCode = err.code === 'TOO_LARGE' ? 413 : err.code === 'TOO_MANY_REDIRECTS' ? 502 : 504
    throw createError({ statusCode, message: err.message })
  }
  throw err
}
