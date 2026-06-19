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
    '/': { prerender: true, headers: { 'Cache-Control': 'public, max-age=3600' } },
    '/robots.txt': { prerender: true },
    '/llms.txt': { prerender: true },
    '/api/**': { prerender: false }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // Hybrid: prerender pages (routeRules above) but deploy /api/** as Vercel serverless functions.
    preset: 'vercel'
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
