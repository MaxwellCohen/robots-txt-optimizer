<script setup>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="size-5 text-primary"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 8V4H8" />
            <rect
              width="16"
              height="12"
              x="4"
              y="8"
              rx="2"
            />
            <path d="M2 14h2m16 0h2m-7-1v2m-6-2v2" />
          </svg>
          <span>Robots.txt Optimizer</span>
        </NuxtLink>

        <div class="flex items-center gap-1.5">
          <NuxtLink
            to="/about"
            class="rounded-md inline-flex items-center px-2.5 py-1.5 text-sm text-muted hover:text-default hover:bg-elevated"
          >
            About
          </NuxtLink>

          <ClientOnly>
            <UColorModeButton />
          </ClientOnly>

          <a
            href="https://github.com/MaxwellCohen/robots-txt-optimizer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            class="rounded-md inline-flex items-center p-1.5 text-default hover:bg-elevated"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="size-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
    </header>

    <main class="min-h-[calc(100vh-3.5rem)]">
      <NuxtPage />
    </main>

    <footer class="border-t border-default">
      <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-4">
        <p class="text-sm text-muted text-center lg:text-left">
          Robots.txt Optimizer • © {{ new Date().getFullYear() }}
        </p>
      </div>
    </footer>
  </UApp>
</template>
