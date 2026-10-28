# Domain glossary — robots-txt-optimizer

## Robots text

Raw `robots.txt` file content as a string.

## RobotsDocument

Parsed canonical structure: user-agent groups, directives, sitemaps, and line references. All analysis modules operate on a `RobotsDocument`, not raw text.

## User-agent group

One or more `User-agent` lines followed by directives (`Allow`, `Disallow`, etc.) until the next group or a global `Sitemap` line.

## Validation issue

Syntax or semantic problem with severity (`error` | `warning`), message, and optional line/column.

## Directive summary

Declared `Allow` / `Disallow` patterns (and other directives) per user-agent group.

## Path verdict

Simulated allowed/blocked result for a `(userAgent, path)` pair, including the matched rule for explainability.

## Optimization suggestion

Actionable change: remove duplicate directive, remove dead rule, merge duplicate groups, etc.

## Robots engine

The `@robots-txt-optimizer/core` package — parse, validate, analyze, optimize, and fetch logic. All analysis modules operate on a `RobotsDocument`, not raw text. Consumable from the Nuxt app, a future CLI, or other tools without UI coupling.

## Fetch seam

Universal robots.txt fetch (`@robots-txt-optimizer/core/fetch`) plus a Node SSRF-safe adapter (`@robots-txt-optimizer/core/node`). URL normalization and response validation live in the fetch module; the Nuxt server route maps domain errors to HTTP status codes.

## Crawler access

Status (`allowed` | `partial` | `blocked`) of a known crawler from the catalog in `crawlers.ts`, grouped by category: search, AI training, AI search, AI user-triggered fetches. `blocked` means `/` is disallowed; `partial` means some paths are.

## Crawler policy

Map of crawler token → `allow` | `block`, applied by rewriting robots text with managed groups. Allowed crawlers inherit the `*` group's rules minus a site-wide block, because a named group replaces the catch-all for that crawler.

## Fetch diagnostic

Explanation of how crawlers treat a robots.txt HTTP response (status, redirects, content type, size, BOM).

## Sitemap conflict

A URL listed in a sitemap that robots.txt blocks for a given user-agent.
