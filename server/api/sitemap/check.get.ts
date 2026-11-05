import { enforceRateLimit } from '../../utils/rate-limit'
import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import { queryList } from '../../utils/query-list'
import { toHttpError } from '../../utils/robots-errors'
import { secureFetchSitemaps } from '@robots-txt-optimizer/core/node'

const MAX_INPUT_SITEMAPS = 5

function validateQuery(query: Record<string, unknown>) {
  const urls = queryList(query.url)
  if (urls.length === 0) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }
  if (urls.length > MAX_INPUT_SITEMAPS) {
    throw createError({ statusCode: 400, message: `Too many sitemap URLs (max ${MAX_INPUT_SITEMAPS})` })
  }
  for (const url of urls) {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw createError({ statusCode: 400, message: `Invalid sitemap URL: ${url}` })
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw createError({ statusCode: 400, message: 'Only http and https sitemap URLs are allowed' })
    }
  }
  return { urls }
}

/**
 * GET /api/sitemap/check?url=<sitemap>[&url=<sitemap>]
 * Downloads the sitemaps (following indexes) and returns their page URLs.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const { urls } = validateQuery(getQuery(event))

  try {
    return await secureFetchSitemaps(urls)
  } catch (err) {
    toHttpError(err)
  }
})
