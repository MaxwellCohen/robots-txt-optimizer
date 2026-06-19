// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    ...(process.env.NODE_ENV === 'development' ? ['@nuxt/eslint'] as const : [])
  ],

  devtools: {
    enabled: process.env.NODE_ENV === 'development'
  },

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false,
    theme: {
      colors: ['primary', 'error', 'warning', 'neutral'],
      transitions: false
    },
    experimental: {
      componentDetection: true
    }
  },

  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_ROBOTS_FETCH_CLIENT_FIRST=false to skip browser fetch and use the server proxy only.
      robotsFetchClientFirst: true
    }
  },

  build: {
    transpile: ['@robots-txt-optimizer/core']
  },

  routeRules: {
    // Prebuilt at deploy; CDN caches 24h with week-long stale-while-revalidate.
    '/': {
      prerender: true,
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
      }
    },
    '/robots.txt': {
      prerender: true,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    },
    '/llms.txt': {
      prerender: true,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    },
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    },
    '/api/**': { prerender: false }
  },

  experimental: {
    // Smaller prerendered HTML; state ships in a separate cacheable JSON payload.
    payloadExtraction: true
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Hybrid: prerender pages (routeRules above) but deploy /api/** as Vercel serverless functions.
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/robots.txt', '/llms.txt']
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 64
    }
  },

  ...(process.env.NODE_ENV === 'development'
    ? {
        eslint: {
          config: {
            stylistic: {
              commaDangle: 'never',
              braceStyle: '1tbs'
            }
          }
        }
      }
    : {})
})
