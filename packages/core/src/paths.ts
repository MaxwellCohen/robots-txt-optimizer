export const DEFAULT_USER_AGENTS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  '*'
] as const

export const DEFAULT_PATHS = [
  '/',
  '/admin',
  '/api/',
  '/search',
  '/private/',
  '/blog/post-1'
] as const

export const SIMULATION_ORIGIN = 'https://example.com'

/** Search crawlers checked for render-resource blocks and sitemap conflicts. */
export const CHECK_AGENTS = ['Googlebot', 'Bingbot'] as const
