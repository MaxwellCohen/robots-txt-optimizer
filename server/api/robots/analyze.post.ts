import { createError, defineEventHandler, readBody } from 'nuxt/server'
import { buildAnalyzeResponse, MAX_ANALYZE_TEXT_BYTES } from '../../utils/analyze-response'

interface AnalyzeBody {
  text?: unknown
  userAgents?: unknown
  paths?: unknown
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

/**
 * POST /api/robots/analyze  { "text": "...", "userAgents"?: [], "paths"?: [] }
 * Analyzes robots.txt content sent in the request body.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeBody>(event)
  if (!body || typeof body.text !== 'string') {
    throw createError({ statusCode: 400, message: 'Body must be JSON with a "text" string' })
  }
  if (new TextEncoder().encode(body.text).byteLength > MAX_ANALYZE_TEXT_BYTES) {
    throw createError({ statusCode: 413, message: 'robots.txt text is too large' })
  }

  return buildAnalyzeResponse(body.text, {
    userAgents: stringList(body.userAgents),
    paths: stringList(body.paths)
  })
})
