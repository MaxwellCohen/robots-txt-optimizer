// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],

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
    // Prerender at build so CDN has HTML immediately (sub-1s FCP).
    // ISR regenerates in the background after the revalidation window.
    '/': {
      prerender: true,
      isr: 1209600
    },
    '/about': {
      prerender: true,
      isr: 1209600
    },
    '/compare': {
      prerender: true,
      isr: 1209600
    },
    '/robots.txt': {
      prerender: true
    },
    '/llms.txt': {
      prerender: true
    },
    '/_nuxt/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    },
    '/api/**': {
      isr: false
    }
  },

  future: {
    compatibilityVersion: 5
  },

  features: {
    inlineStyles: true
  },

  experimental: {
    // https://nuxt.com/blog/v4-5#%EF%B8%8F-forwarded-preload-hints-on-prefetch
    prefetchPreloadTags: true,
    early404: true,
    // Inline payload in the initial HTML (no /_payload.json request on first load);
    // still extract it to _payload.json for client-side navigation.
    payloadExtraction: 'client'
  },

  compatibilityDate: '2026-09-01',

  nitro: {
    future: {
      // Prefer explicit `isr` route rules on Vercel (no legacy swr/static mapping).
      nativeSWR: true
    },
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/about', '/compare', '/robots.txt', '/llms.txt']
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 64
    }
  }
})
