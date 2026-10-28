import { diagnoseFetch, normalizeRobotsUrl } from '@robots-txt-optimizer/core/fetch'
import { secureFetchRobotsTxt } from '@robots-txt-optimizer/core/node'
import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import { buildAnalyzeResponse } from '../../utils/analyze-response'
import { queryList, toHttpError } from '../../utils/robots-errors'

/**
 * GET /api/robots/analyze?url=example.com[&agents=Googlebot,GPTBot][&paths=/,/blog]
 * Fetches a site's robots.txt and returns the full analysis as JSON.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  if (typeof query.url !== 'string' || !query.url.trim()) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }

  let fetched
  try {
    fetched = await secureFetchRobotsTxt(query.url)
  } catch (err) {
    toHttpError(err)
  }

  const { text, ...fetchInfo } = fetched
  const ok = fetched.status >= 200 && fetched.status < 300

  return {
    url: fetched.finalUrl,
    fetch: fetchInfo,
    diagnostics: diagnoseFetch(fetched, normalizeRobotsUrl(query.url).toString()),
    analysis: ok
      ? buildAnalyzeResponse(text, { userAgents: queryList(query.agents), paths: queryList(query.paths) })
      : null
  }
})
