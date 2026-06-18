// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: process.env.NODE_ENV === 'development'
  },

  css: ['~/assets/css/main.css'],

  ui: {
    theme: {
      colors: ['error', 'warning', 'neutral']
    }
  },

  build: {
    transpile: ['@robots-txt-optimizer/core']
  },

  routeRules: {
    '/': { prerender: true, static: true, headers: { 'Cache-Control': 'public, max-age=3600' } },
    '/robots.txt': { prerender: true },
    '/llms.txt': { prerender: true },
    '/api/**': { prerender: false }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'static'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
