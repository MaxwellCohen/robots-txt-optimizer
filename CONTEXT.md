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
