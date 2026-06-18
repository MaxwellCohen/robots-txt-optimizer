import {
  RobotsFetchError,
  RobotsFetchSecurityError,
  RobotsUrlError
} from '@robots-txt-optimizer/core/fetch'
import { secureFetchRobotsTxt } from '@robots-txt-optimizer/core/node'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const urlParam = query.url

  if (typeof urlParam !== 'string' || !urlParam.trim()) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }

  try {
    return await secureFetchRobotsTxt(urlParam)
  } catch (err) {
    if (err instanceof RobotsUrlError) {
      throw createError({ statusCode: 400, message: err.message })
    }
    if (err instanceof RobotsFetchSecurityError) {
      throw createError({ statusCode: 403, message: err.message })
    }
    if (err instanceof RobotsFetchError) {
      const statusCode = err.code === 'TOO_LARGE' ? 413 : 504
      throw createError({ statusCode, message: err.message })
    }
    throw err
  }
})
