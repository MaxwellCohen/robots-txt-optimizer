# Robots.txt Optimizer

Validate, analyze, and optimize `robots.txt` files. Paste content directly or fetch from a URL, then review syntax issues, per–user-agent rules, path simulation, and actionable cleanup suggestions.

Built with [Nuxt](https://nuxt.com) and [Nuxt UI](https://ui.nuxt.com).

## Features

- Fetch (with server-side CORS fallback) or paste `robots.txt`; start from templates; share via `/?url=example.com`
- Validation and crawlability warnings, search and AI crawler access with one-click AI policies
- RFC 9309 path simulation, sitemap-blocked URL detection, fetch diagnostics
- Selectable optimization suggestions with a diff; `/compare` for two files
- CLI, GitHub Action, and JSON API running the same checks

## CLI

```bash
npx @maxwellcohen/robots-txt-optimizer check example.com --check-sitemaps --fail-on warning

# from a checkout
pnpm build:cli
pnpm cli check public/robots.txt --expect-allowed "Googlebot:/" --expect-blocked "GPTBot:/"
pnpm cli check example.com --check-sitemaps --fail-on warning
pnpm cli optimize robots.txt --write --ai block-ai-training
pnpm cli compare staging.example.com example.com
pnpm cli crawlers example.com
```

Commands: `check`, `optimize`, `compare`, and `crawlers` (search/AI crawler access per bot; `--format json` available). Inputs are a file path, `-` for stdin, or a URL/domain. Run with `--help` for all options. `check` also supports `--format github` (workflow annotations).

Exit codes: `0` success, `1` check failed, `2` usage or input error.

## GitHub Action

```yaml
- uses: MaxwellCohen/robots-txt-optimizer@v1
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

The action installs dependencies and builds the CLI at run time.

## JSON API

| Endpoint | Description |
| --- | --- |
| `GET /api/robots/analyze?url=example.com&agents=Googlebot,GPTBot&paths=/,/blog` | Fetch a site's robots.txt and return diagnostics plus the full analysis |
| `POST /api/robots/analyze` `{ "text": "...", "userAgents": [], "paths": [] }` | Analyze robots.txt content |
| `GET /api/sitemap/check?url=https://example.com/sitemap.xml` | Fetch sitemaps (and indexes) and return their URLs |
| `GET /api/robots/fetch?url=example.com` | Raw fetch proxy used by the app |

Server-side fetches refuse private and local addresses, including via redirects. API routes are rate limited to 30 requests per minute per IP (in-memory, per instance); `/api/sitemap/check` accepts up to 5 repeated `url` parameters.

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
| `pnpm test` | Run unit tests (Vitest) in all packages |
| `pnpm build:cli` | Bundle the CLI to `packages/cli/dist` |
| `pnpm cli <args>` | Run the built CLI |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks (app and packages) |

## Project structure

```
app/                         # UI (pages, components, composables)
app/utils/url-text.ts        # Shareable URL compression (?r=, ?s= query params)
packages/core/               # @robots-txt-optimizer/core — parse, validate, fetch, analyze, optimize, crawlers, sitemaps, compare
packages/cli/                # robots-txt-optimizer CLI (built with `pnpm build:cli`; used by the GitHub Action)
server/api/                  # Fetch proxy, analyze API, and sitemap check endpoints
action.yml                   # GitHub Action
```

The robots engine in `packages/core/` is framework-agnostic and covered by unit tests. Import it from `@robots-txt-optimizer/core` in the app, the CLI, or other tools.

## License

MIT
