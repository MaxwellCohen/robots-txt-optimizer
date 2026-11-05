import { createError } from 'nuxt/server'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 30

// In-memory per-instance limiter; resets on cold start and is not shared across instances.
const hits = new Map<string, { count: number, resetAt: number }>()
let lastCleanup = 0

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

/** Call at the top of each API handler. */
export function enforceRateLimit(event: { req: Request }) {
  const now = Date.now()
  if (now - lastCleanup > WINDOW_MS) {
    lastCleanup = now
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key)
      }
    }
  }

  const ip = clientIp(event.req)
  let entry = hits.get(ip)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    hits.set(ip, entry)
  }
  entry.count++

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    throw createError({ statusCode: 429, message: `Too many requests; retry in ${retryAfter}s` })
  }
}
