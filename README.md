# Robots.txt Optimizer

Validate, analyze, and optimize `robots.txt` files. Paste content directly or fetch from a URL, then review syntax issues, per–user-agent rules, path simulation, and actionable cleanup suggestions.

Built with [Nuxt](https://nuxt.com) and [Nuxt UI](https://ui.nuxt.com).

## Features

- **Fetch or paste** — Load `robots.txt` from a domain (with server-side fallback when CORS blocks the browser) or paste content manually
- **Shareable URLs** — Analyze a site via `/?url=example.com`
- **Validation** — Syntax and spec checks using [robots-linter](https://www.npmjs.com/package/robots-linter) and [@trybyte/robotstxt-parser](https://www.npmjs.com/package/@trybyte/robotstxt-parser)
- **Directive summary** — Allow, disallow, and other rules grouped by user-agent
- **Path simulation** — See how common crawlers (Googlebot, Bingbot, GPTBot, `*`) would treat typical paths
- **Optimization** — Detect duplicate rules, dead rules, redundant catch-alls, empty groups, and missing user-agents; preview a cleaned-up file

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
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |

## Project structure

```
app/                         # UI (pages, components, composables)
app/utils/url-text.ts        # Shareable URL compression (?r=, ?s= query params)
packages/core/               # @robots-txt-optimizer/core — parse, validate, fetch, analyze, optimize
server/api/robots/           # Server-side fetch endpoint (CORS fallback)
```

The robots engine in `packages/core/` is framework-agnostic and covered by unit tests. Import it from `@robots-txt-optimizer/core` in the app or from a future CLI package.

## License

MIT
