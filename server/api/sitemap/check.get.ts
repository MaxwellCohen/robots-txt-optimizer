import { secureFetchSitemaps } from '@robots-txt-optimizer/core/node'
import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import { queryList, toHttpError } from '../../utils/robots-errors'

const MAX_INPUT_SITEMAPS = 5

/**
 * GET /api/sitemap/check?url=<sitemap>[&url=<sitemap>]
 * Downloads the sitemaps (following indexes) and returns their page URLs.
 */
export default defineEventHandler(async (event) => {
  const urls = queryList(getQuery(event).url)
  if (urls.length === 0) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
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

  try {
    return await secureFetchSitemaps(urls.slice(0, MAX_INPUT_SITEMAPS))
  } catch (err) {
    toHttpError(err)
  }
})
