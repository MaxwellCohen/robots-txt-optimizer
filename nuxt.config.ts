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

  build: {
    transpile: ['@robots-txt-optimizer/core']
  },

  routeRules: {
    '/': { prerender: true },
    '/robots.txt': { prerender: true },
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
