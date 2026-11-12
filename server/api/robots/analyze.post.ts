import { enforceRateLimit } from '../../utils/rate-limit'
import { createError, defineEventHandler, readBody } from 'nuxt/server'
import { buildAnalyzeResponseOrHttpError } from '../../utils/analyze-response'

const MAX_ANALYZE_TEXT_BYTES = 2 * 1024 * 1024

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

function validateBody(body: unknown) {
  const { text, userAgents, paths } = (body ?? {}) as Record<string, unknown>
  if (typeof text !== 'string') {
    throw createError({ statusCode: 400, message: 'Body must be JSON with a "text" string' })
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_ANALYZE_TEXT_BYTES) {
    throw createError({ statusCode: 413, message: 'robots.txt text is too large' })
  }
  return { text, userAgents: stringList(userAgents), paths: stringList(paths) }
}

/**
 * POST /api/robots/analyze  { "text": "...", "userAgents"?: [], "paths"?: [] }
 * Analyzes robots.txt content sent in the request body.
 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event)
  // Reject oversized bodies before reading them (JSON escaping only adds bytes).
  const contentLength = Number(event.req.headers.get('content-length'))
  if (contentLength > MAX_ANALYZE_TEXT_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: 'robots.txt text is too large' })
  }

  const { text, userAgents, paths } = validateBody(await readBody(event))
  return buildAnalyzeResponseOrHttpError(text, { userAgents, paths })
})
