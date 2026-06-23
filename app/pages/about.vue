<script setup lang="ts">
useSeoMeta({
  title: 'About robots.txt',
  description:
    'Learn what robots.txt is, how crawlers use it, and how Robots.txt Optimizer validates, analyzes, and simplifies your file.',
  ogTitle: 'About robots.txt — Robots.txt Optimizer',
  ogDescription:
    'What robots.txt does, how Allow and Disallow rules work, and the optimizations this tool applies automatically.'
})

const exampleRobots = `User-agent: *
Disallow: /admin/
Allow: /admin/public/

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml`

const optimizations = [
  {
    type: 'Missing user-agent',
    detects: 'Allow, Disallow, or other directives that appear before any User-agent line',
    action: 'Inserts User-agent: * so crawlers know which group the rules belong to',
    auto: true
  },
  {
    type: 'Empty group',
    detects: 'A User-agent declaration with no rules underneath',
    action: 'Removes the empty group to reduce noise',
    auto: true
  },
  {
    type: 'Duplicate rule',
    detects: 'The same Allow or Disallow path repeated in one group',
    action: 'Keeps one copy and drops the rest',
    auto: true
  },
  {
    type: 'Duplicate group',
    detects: 'Separate groups with identical user-agents and identical rules',
    action: 'Merges user-agents into a single group',
    auto: true
  },
  {
    type: 'Dead rule',
    detects: 'A later Allow or Disallow that never changes whether a path is crawled',
    action: 'Removes rules superseded by an earlier match in the same group',
    auto: true
  },
  {
    type: 'Redundant catch-all',
    detects: 'A User-agent: * group when specific crawler groups already exist',
    action: 'Flags it for review — not removed automatically, since the catch-all may still matter',
    auto: false
  }
] as const

const features = [
  {
    icon: 'i-lucide-shield-check',
    title: 'Validation',
    description:
      'Syntax checks via robots-linter plus semantic warnings: missing colons, unknown directives, invalid sitemap URLs, and more.'
  },
  {
    icon: 'i-lucide-list-tree',
    title: 'Directive summary',
    description:
      'See Allow, Disallow, Crawl-delay, and other rules grouped by user-agent, with plain-language pattern explanations.'
  },
  {
    icon: 'i-lucide-route',
    title: 'Path simulation',
    description:
      'Test how Googlebot, Bingbot, GPTBot, or any user-agent would treat paths like /, /admin, or /api/.'
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'Optimization',
    description:
      'Detect redundant or ineffective rules and preview a cleaned robots.txt you can copy — comments and unchanged lines are preserved.'
  }
] as const
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
            Every public website can host a plain-text file at <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">/robots.txt</code>.
            Crawlers — Googlebot, Bingbot, GPTBot, and hundreds of others — fetch it before (or while) they crawl your site.
          </p>
          <p>
            The file does <strong>not</strong> block access at the HTTP level. It is a polite request: crawlers that honor the standard should skip URLs you disallow.
            Sensitive areas still need authentication, not just a Disallow line.
          </p>
          <p>
            robots.txt is organized into <strong>groups</strong>. Each group starts with one or more <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">User-agent</code> lines
            (which crawlers the rules apply to) followed by directives such as <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">Allow</code>,
            <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">Disallow</code>, and optionally a top-level
            <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">Sitemap</code> URL.
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
          <RobotsLineNumberPre :text="exampleRobots" />
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
          v-for="feature in features"
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
            v-for="item in optimizations"
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
