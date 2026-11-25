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
    '/': { prerender: true },
    '/about': { prerender: true },
    '/compare': { prerender: true },
    '/robots.txt': {
      prerender: true
    },
    '/llms.txt': {
      prerender: true
    },
    '/api/**': {
      isr: false,
      headers: { 'Cache-Control': 'no-store' }
    }
  },

  // Kept: removal not verified (no full build allowed while app/ is being edited).
  future: {
    compatibilityVersion: 5
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

  hooks: {
    // @nuxt/icon always registers this server-only virtual module, even though
    // `icon.provider: 'none'` removes the route that imported it. Left in place, its
    // Nitro v2 import alone makes the build warn with NUXT_B9003.
    'nitro:config'(nitroConfig) {
      delete nitroConfig.virtual?.['#nuxt-icon-server-runtime']
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
    // Every icon ships in the scanned bundle, which SSR reads too, so nothing is
    // fetched at runtime. 'none' also drops @nuxt/icon's server route, whose Nitro v2
    // imports made the build warn with NUXT_B9003. An icon the scan misses will not
    // render (it logs "[Icon] failed to load icon"), so keep icon names as literals.
    provider: 'none',
    clientBundle: {
      scan: {
        // The default skips plain .ts files; icon names also live in app/utils.
        globInclude: ['app/**/*.{vue,ts}']
      },
      sizeLimitKb: 64
    }
  }
})
