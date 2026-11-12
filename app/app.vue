<script setup lang="ts">
const year = useState('footer-year', () => new Date().getFullYear())

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'shortcut icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<template>
  <UApp>
    <header class="bg-default/75 backdrop-blur border-b border-default sticky top-0 z-50 h-14">
      <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 h-full">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold"
        >
          <AppLogo />
          <span>Robots.txt Optimizer</span>
        </NuxtLink>

        <div class="flex items-center gap-1.5">
          <NuxtLink
            to="/compare"
            class="rounded-md inline-flex items-center px-2.5 py-1.5 text-sm text-muted hover:text-default hover:bg-elevated"
          >
            Compare
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="rounded-md inline-flex items-center px-2.5 py-1.5 text-sm text-muted hover:text-default hover:bg-elevated"
          >
            About
          </NuxtLink>

          <ClientOnly>
            <UColorModeButton />
          </ClientOnly>

          <UButton
            to="https://github.com/MaxwellCohen/robots-txt-optimizer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            icon="i-lucide-github"
            color="neutral"
            variant="ghost"
          />
        </div>
      </div>
    </header>

    <main class="min-h-[calc(100vh-3.5rem)]">
      <NuxtPage />
    </main>

    <footer class="border-t border-default">
      <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-4">
        <p class="text-sm text-muted text-center lg:text-left">
          Robots.txt Optimizer • © {{ year }}
        </p>
      </div>
    </footer>
  </UApp>
</template>
