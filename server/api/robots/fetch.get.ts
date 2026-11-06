import { enforceRateLimit } from '../../utils/rate-limit'
import { defineEventHandler, getQuery } from 'nuxt/server'
import { toHttpError } from '../../utils/robots-errors'
import { validateUrlQuery } from '../../utils/validate-query'
import { secureFetchRobotsTxt } from '@robots-txt-optimizer/core/node'

export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const { url } = validateUrlQuery(getQuery(event))

  try {
    return await secureFetchRobotsTxt(url)
  } catch (err) {
    toHttpError(err)
  }
})
