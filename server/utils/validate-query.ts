import { createError } from 'nuxt/server'
/** Validates a required single `url` query parameter (shared by the robots routes). */
export function validateUrlQuery(query: Record<string, unknown>) {
  if (typeof query.url !== 'string' || !query.url.trim()) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }
  return { url: query.url }
}
