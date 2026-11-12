# @maxwellcohen/robots-txt-optimizer

Validate, test, and optimize `robots.txt` files from the command line or CI. Single bundled file, no runtime dependencies, Node 20+.

```sh
npx @maxwellcohen/robots-txt-optimizer check example.com --fail-on warning
npx @maxwellcohen/robots-txt-optimizer optimize robots.txt --write --ai block-ai-training
npx @maxwellcohen/robots-txt-optimizer compare staging.example.com example.com
```

Every command takes a local path, `-` for stdin, or a URL/domain (`example.com` fetches `https://example.com/robots.txt`).

## Commands

### `check <file|url>`

Validates syntax and crawlability (blocked CSS/JS, site-wide blocks, misspelled or retired crawler tokens) and enforces your own expectations.

| Option | Description |
| --- | --- |
| `--fail-on <level>` | `error` (default), `warning`, or `none` |
| `--expect-allowed <agent:path>` | Fail unless the user-agent may crawl the path. Repeatable. |
| `--expect-blocked <agent:path>` | Fail unless the user-agent is blocked from the path. Repeatable. |
| `--check-sitemaps` | Fetch the `Sitemap:` URLs and fail if robots.txt blocks any URL they list |
| `--format <format>` | `text` (default), `json`, or `github` (workflow annotations) |

```sh
robots-txt-optimizer check public/robots.txt \
  --expect-allowed "Googlebot:/" \
  --expect-blocked "GPTBot:/" \
  --check-sitemaps
```

### `optimize <file|url>`

Removes duplicate rules, dead rules, redundant catch-alls and empty groups, and prints the result. `--write` overwrites the input file. `--ai <preset>` also applies an AI crawler policy: `block-ai-training`, `block-all-ai`, or `allow-all-ai`.

### `compare <before> <after>`

Shows the line diff, which crawlers change status, and which crawl verdicts flip. Useful for staging vs. production. Supports `--format json`.

### `crawlers <file|url>`

Lists access status for known search, AI training, AI search and user-triggered AI crawlers. Supports `--format json`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | `check` failed |
| `2` | Usage or input error (bad option, file not found, fetch failed) |

A URL that returns 404 is treated as an empty robots.txt (everything allowed) by `compare` and `crawlers`, and is reported by `check`. Any other failed fetch is an error rather than an empty file.

## GitHub Action

The same CLI is available as an action:

```yaml
- uses: MaxwellCohen/robots-txt-optimizer@main
  with:
    path: public/robots.txt
    expect-allowed: |
      Googlebot:/
    expect-blocked: |
      GPTBot:/
```

## Matching rules

Path matching follows RFC 9309: `*` wildcards, a trailing `$` anchor, longest match wins, and allow wins ties. Percent-encoded characters such as `%2A`, `%24` and `%2F` are matched literally.

## License

MIT
