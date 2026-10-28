import { applyCrawlerPolicy, crawlerPolicyFromPreset } from './crawlers'
import { parseRobotsTxt } from './parse'

export interface RobotsTemplate {
  id: string
  name: string
  description: string
  text: string
}

const SITEMAP = 'Sitemap: https://example.com/sitemap.xml'

const ALLOW_ALL = `User-agent: *
Allow: /

${SITEMAP}
`

const BASE_TEMPLATES: RobotsTemplate[] = [
  {
    id: 'allow-all',
    name: 'Allow everything',
    description: 'Let every crawler access the whole site and point them to your sitemap',
    text: ALLOW_ALL
  },
  {
    id: 'staging',
    name: 'Staging / block everything',
    description: 'Keep a staging or preview environment out of every crawler. Never ship this to production.',
    text: `# Staging environment — do not deploy to production
User-agent: *
Disallow: /
`
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Block the admin area and internal search while keeping admin-ajax and theme assets crawlable',
    text: `User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /?s=
Disallow: /search/

Sitemap: https://example.com/wp-sitemap.xml
`
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Shopify defaults for cart, checkout, account, and faceted collection URLs (edit via robots.txt.liquid)',
    text: `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkouts/
Disallow: /checkout
Disallow: /account
Disallow: /search
Disallow: /collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /*/collections/*sort_by*
Disallow: /policies/
Disallow: /*preview_theme_id*
Disallow: /*preview_script_id*

${SITEMAP}
`
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Block API routes but keep /_next/ assets crawlable so pages render (or generate from app/robots.ts)',
    text: `User-agent: *
Allow: /
Disallow: /api/

${SITEMAP}
`
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    description: 'Block server API routes but keep /_nuxt/ assets crawlable (or manage with @nuxtjs/robots)',
    text: `User-agent: *
Allow: /
Disallow: /api/

${SITEMAP}
`
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Keep product and category pages crawlable while blocking cart, checkout, and infinite filter URLs',
    text: `User-agent: *
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /search
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*sessionid=

${SITEMAP}
`
  }
]

let cached: RobotsTemplate[] | null = null

export function getRobotsTemplates(): RobotsTemplate[] {
  cached ??= [
    ...BASE_TEMPLATES,
    {
      id: 'block-ai-training',
      name: 'Allow search, block AI training',
      description: 'Stay in search engines and AI answers, but opt out of model training crawlers',
      text: applyCrawlerPolicy(parseRobotsTxt(ALLOW_ALL), crawlerPolicyFromPreset('block-ai-training'))
    }
  ]
  return cached
}
