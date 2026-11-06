export const aboutExampleRobots = `User-agent: *
Disallow: /admin/
Allow: /admin/public/

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml`

export const aboutOptimizations = [
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

export const aboutFeatures = [
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
      'Test how Googlebot, Bingbot, GPTBot, or any user-agent would treat paths like /, /admin, or /api/, using RFC 9309 longest-match rules.'
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'Optimization',
    description:
      'Detect redundant or ineffective rules, pick which fixes to apply, and review them as a diff — comments and unchanged lines are preserved.'
  },
  {
    icon: 'i-lucide-bot',
    title: 'AI crawler controls',
    description:
      'See which search engines and AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, and more) can reach your site, and apply a policy in one click.'
  },
  {
    icon: 'i-lucide-map',
    title: 'Sitemap check',
    description:
      'Fetch your sitemaps and find URLs you ask search engines to index but block in robots.txt.'
  },
  {
    icon: 'i-lucide-server',
    title: 'Fetch diagnostics',
    description:
      'Learn how crawlers treat your server response: 5xx errors block the whole site, 4xx means no rules, and Google stops reading after 500 KiB.'
  },
  {
    icon: 'i-lucide-git-compare',
    title: 'Compare & change tracking',
    description:
      'Compare staging with production, and get a heads-up when a site\'s robots.txt changed since you last checked it.'
  },
  {
    icon: 'i-lucide-terminal',
    title: 'CLI, GitHub Action & API',
    description:
      'Run the same checks in CI to stop a bad robots.txt from shipping, or call the JSON API from your own tools.'
  }
] as const
