<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const { copy, copied } = useClipboard({ source: aboutAiPrompt })

useSeoMeta({
  title: 'About robots.txt',
  description:
    'Learn what robots.txt is, how crawlers use it, and how Robots.txt Optimizer validates, analyzes, and simplifies your file.',
  ogTitle: 'About robots.txt — Robots.txt Optimizer',
  ogDescription:
    'What robots.txt does, how Allow and Disallow rules work, and the optimizations this tool applies automatically.'
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-10">
    <div class="space-y-3 text-center">
      <h1 class="text-3xl font-bold tracking-tight">
        About robots.txt
      </h1>
      <p class="text-muted max-w-2xl mx-auto">
        A plain-language guide to the file that tells search engines and AI crawlers what they may fetch — and how this tool helps you get it right.
      </p>
    </div>

    <UCard>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-file-text"
            class="size-5 text-primary"
          />
          <h2 class="text-xl font-semibold">
            What is robots.txt?
          </h2>
        </div>

        <div class="space-y-3 text-sm leading-relaxed text-default">
          <p>
            Every public website can host a plain-text file at <InlineCode>/robots.txt</InlineCode>.
            Crawlers — Googlebot, Bingbot, GPTBot, and hundreds of others — fetch it before (or while) they crawl your site.
          </p>
          <p>
            The file does <strong>not</strong> block access at the HTTP level. It is a polite request: crawlers that honor the standard should skip URLs you disallow.
            Sensitive areas still need authentication, not just a Disallow line.
          </p>
          <p>
            robots.txt is organized into <strong>groups</strong>. Each group starts with one or more <InlineCode>User-agent</InlineCode> lines
            (which crawlers the rules apply to) followed by directives such as <InlineCode>Allow</InlineCode>,
            <InlineCode>Disallow</InlineCode>, and optionally a top-level
            <InlineCode>Sitemap</InlineCode> URL.
          </p>
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-git-branch"
            class="size-5 text-primary"
          />
          <h2 class="text-xl font-semibold">
            How matching works
          </h2>
        </div>

        <div class="space-y-3 text-sm leading-relaxed">
          <p>
            Within a user-agent group, crawlers walk rules <strong>top to bottom</strong>. The <strong>most specific matching rule wins</strong>.
            A later rule only matters if it matches a path the earlier rules did not already decide.
          </p>
          <ul class="list-disc pl-5 space-y-1.5 text-muted">
            <li><code class="font-mono text-xs">Disallow: /</code> blocks the entire site for that user-agent.</li>
            <li><code class="font-mono text-xs">Allow: /public/</code> after a broader disallow can reopen specific paths.</li>
            <li><code class="font-mono text-xs">*</code> in a path matches any sequence of characters; <code class="font-mono text-xs">$</code> anchors to the end.</li>
            <li>An empty <code class="font-mono text-xs">Disallow:</code> means no restrictions for that group.</li>
          </ul>
        </div>

        <div>
          <p class="text-sm text-muted mb-2">
            Example
          </p>
          <RobotsLineNumberPre :text="aboutExampleRobots" />
        </div>
      </div>
    </UCard>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-wrench"
          class="size-5 text-primary"
        />
        <h2 class="text-xl font-semibold">
          What this app does
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UCard
          v-for="feature in aboutFeatures"
          :key="feature.title"
        >
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UIcon
                :name="feature.icon"
                class="size-5 text-primary"
              />
              <h3 class="font-semibold">
                {{ feature.title }}
              </h3>
            </div>
            <p class="text-sm text-muted leading-relaxed">
              {{ feature.description }}
            </p>
          </div>
        </UCard>
      </div>

      <p class="text-sm text-muted">
        Paste a file or fetch it from any URL. Share results via link — the analyzer supports compressed URL parameters for text and simulation settings.
      </p>
    </div>

    <UCard>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-sparkles"
            class="size-5 text-primary"
          />
          <h2 class="text-xl font-semibold">
            Optimizations
          </h2>
        </div>

        <p class="text-sm text-muted leading-relaxed">
          The optimizer scans your parsed file for common mistakes and bloat. When it can fix something safely, it builds a preview that keeps your comments and makes minimal line edits.
        </p>

        <div class="space-y-3">
          <div
            v-for="item in aboutOptimizations"
            :key="item.type"
            class="rounded-lg border border-default p-4 space-y-2"
          >
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-medium text-sm">
                {{ item.type }}
              </h3>
              <UBadge
                :color="item.auto ? 'primary' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{ item.auto ? 'Auto-fixed' : 'Suggestion only' }}
              </UBadge>
            </div>
            <dl class="grid gap-2 text-sm sm:grid-cols-[minmax(0,7rem)_1fr]">
              <dt class="text-muted">
                Detects
              </dt>
              <dd>{{ item.detects }}</dd>
              <dt class="text-muted">
                {{ item.auto ? 'Fix' : 'Advice' }}
              </dt>
              <dd>{{ item.action }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-bot"
            class="size-5 text-primary"
          />
          <h2 class="text-xl font-semibold">
            Prompt for your AI assistant
          </h2>
        </div>
        <p class="text-sm text-muted leading-relaxed">
          Paste this into Claude Code, Cursor, or any coding agent to validate and optimize your website's robots.txt with the CLI.
        </p>
        <pre class="rounded-lg border border-default bg-elevated p-4 text-xs whitespace-pre-wrap">{{ aboutAiPrompt }}</pre>
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          variant="subtle"
          @click="copy(aboutAiPrompt)"
        >
          {{ copied ? 'Copied' : 'Copy prompt' }}
        </UButton>
      </div>
    </UCard>

    <div class="text-center pt-2">
      <UButton
        to="/"
        icon="i-lucide-play"
        size="lg"
      >
        Analyze your robots.txt
      </UButton>
    </div>
  </div>
</template>
