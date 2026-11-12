# Robots.txt Optimizer

Validate, analyze, and optimize `robots.txt` files. Paste content directly or fetch from a URL, then review syntax issues, per–user-agent rules, path simulation, and actionable cleanup suggestions.

Built with [Nuxt](https://nuxt.com) and [Nuxt UI](https://ui.nuxt.com).

## Features

- **Fetch or paste** — Load `robots.txt` from a domain (with server-side fallback when CORS blocks the browser) or paste content manually
- **Templates** — Start from WordPress, Shopify, Next.js, Nuxt, e-commerce, staging, or "block AI training" presets
- **Shareable URLs** — Analyze a site via `/?url=example.com`
- **Validation** — Built-in RFC 9309 syntax and spec checks, plus crawlability warnings: blocked CSS/JS, site-wide blocks (staging files on production), and misspelled or retired crawler tokens (`anthropic-ai`, `GPT-Bot`, `Bard`, …)
- **Search & AI crawlers** — Access status for search engines, AI training, AI search, and user-triggered AI fetchers, with one-click policies such as "block AI training, keep AI search"
- **Directive summary** — Allow, disallow, and other rules grouped by user-agent
- **Path simulation** — RFC 9309 matching (wildcards, `$` anchors, longest match wins) for any user-agent and path
- **Sitemap check** — Fetches `Sitemap:` URLs (following sitemap indexes, gzip aware) and lists URLs that robots.txt blocks
- **Fetch diagnostics** — What the HTTP status, redirects, content type, size (Google's 500 KiB limit), and BOM mean for crawlers
- **Optimization** — Detect duplicate rules, dead rules, redundant catch-alls, empty groups, and missing user-agents; choose which fixes to apply and review them as a diff
- **Compare** — `/compare?a=staging.example.com&b=example.com` shows which crawl verdicts and crawler statuses change
- **Change tracking** — The browser remembers the last robots.txt it saw per site and flags changes on your next visit

## CLI

```bash
npx @maxwellcohen/robots-txt-optimizer check public/robots.txt --expect-allowed "Googlebot:/" --expect-blocked "GPTBot:/"
npx @maxwellcohen/robots-txt-optimizer check example.com --check-sitemaps --fail-on warning
npx @maxwellcohen/robots-txt-optimizer optimize robots.txt --write --ai block-ai-training
npx @maxwellcohen/robots-txt-optimizer compare staging.example.com example.com
```

From a checkout, run `pnpm build:cli` and use `node packages/cli/dist/cli.mjs` instead.

Run with `--help` for all options. `check` exits with `1` when the check fails and `2` on usage or input errors. `--format json` and `--format github` (workflow annotations) are available.

## GitHub Action

```yaml
- uses: MaxwellCohen/robots-txt-optimizer@main
  with:
    path: public/robots.txt        # or a site URL
    fail-on: error                 # error | warning | none
    expect-allowed: |
      Googlebot:/
      Googlebot:/blog
    expect-blocked: |
      GPTBot:/
    check-sitemaps: false
```

The action runs the bundled CLI in `packages/cli/dist`. After changing `packages/core` or `packages/cli`, run `pnpm build:cli` and commit the bundle (CI fails if it is stale).

## JSON API

| Endpoint | Description |
| --- | --- |
| `GET /api/robots/analyze?url=example.com&agents=Googlebot,GPTBot&paths=/,/blog` | Fetch a site's robots.txt and return diagnostics plus the full analysis |
| `POST /api/robots/analyze` `{ "text": "...", "userAgents": [], "paths": [] }` | Analyze robots.txt content |
| `GET /api/sitemap/check?url=https://example.com/sitemap.xml` | Fetch sitemaps (and indexes) and return their URLs |
| `GET /api/robots/fetch?url=example.com` | Raw fetch proxy used by the app |

Server-side fetches refuse private and local addresses, including via redirects.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm build:cli` | Bundle the CLI used by the GitHub Action |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |

## Project structure

```
app/                         # UI (pages, components, composables)
app/utils/url-text.ts        # Shareable URL compression (?r=, ?s= query params)
packages/core/               # @robots-txt-optimizer/core — parse, validate, fetch, analyze, optimize, crawlers, sitemaps, compare
packages/cli/                # robots-txt-optimizer CLI (bundled to dist/ for the GitHub Action)
server/api/                  # Fetch proxy, analyze API, and sitemap check endpoints
action.yml                   # GitHub Action
```

The robots engine in `packages/core/` is framework-agnostic and covered by unit tests. Import it from `@robots-txt-optimizer/core` in the app, the CLI, or other tools.

## License

MIT
