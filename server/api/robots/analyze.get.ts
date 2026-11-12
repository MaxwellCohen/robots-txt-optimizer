import { enforceRateLimit } from '../../utils/rate-limit'
import { defineEventHandler, getQuery } from 'nuxt/server'
import { buildAnalyzeResponseOrHttpError } from '../../utils/analyze-response'
import { queryList } from '../../utils/query-list'
import { toHttpError } from '../../utils/robots-errors'
import { validateUrlQuery } from '../../utils/validate-query'
import { diagnoseFetch, normalizeRobotsUrl } from '@robots-txt-optimizer/core/fetch'
import { secureFetchRobotsTxt } from '@robots-txt-optimizer/core/node'

/**
 * GET /api/robots/analyze?url=example.com[&agents=Googlebot,GPTBot][&paths=/,/blog]
 * Fetches a site's robots.txt and returns the full analysis as JSON.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  const q = getQuery(event)
  const query = { url: validateUrlQuery(q).url, agents: queryList(q.agents), paths: queryList(q.paths) }

  let fetched: Awaited<ReturnType<typeof secureFetchRobotsTxt>>
  try {
    fetched = await secureFetchRobotsTxt(query.url)
  } catch (err) {
    return toHttpError(err)
  }

  const requestedUrl = normalizeRobotsUrl(query.url).toString()
  const { text, ...fetchInfo } = fetched
  const ok = fetched.status >= 200 && fetched.status < 300

  return {
    url: fetched.finalUrl,
    fetch: fetchInfo,
    diagnostics: diagnoseFetch(fetched, requestedUrl),
    analysis: ok
      ? buildAnalyzeResponseOrHttpError(text, { userAgents: query.agents, paths: query.paths })
      : null
  }
})
