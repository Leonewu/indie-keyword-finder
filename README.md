# Indie Keyword Finder

Discover rising search opportunities from one seed keyword.

Indie Keyword Finder is an open-source Chrome Extension and Companion Skill for
early keyword research. It recursively explores Google Trends related queries
and surfaces relative signals worth validating in a broader SEO workflow.

It does **not** estimate monthly search volume, keyword difficulty, ranking
probability, traffic, or revenue.

## What it includes

- **Mining first:** start with a seed, expand related queries, and collect
  candidates that satisfy a transparent relative-signal rule.
- **On-device topic filtering:** a packaged sentence-embedding model removes
  semantically unrelated branches before recursive expansion, without an API
  key or per-query fee.
- **Supporting research tools:** keyword lists, favorites, root sequences,
  batch Google Trends comparisons, and small inline actions on Trends pages.
- **Local-first storage:** keywords, settings, and Mining sessions stay in
  Chrome local storage.
- **Companion Skill:** run the same deterministic Mining state model from
  `.agents/skills/indie-keyword-finder` without installing the Extension, with
  an explicit semantic-review field for recursive expansion.
- **English and Chinese UI:** switch languages from Settings.

## How Mining works

The first request contains only the seed so Google Trends can return its related
queries. Later batches reuse that seed as the visible reference and compare up
to four candidates at a time—there is no unrelated hidden default term. Mining
keeps at most five rising queries per processed keyword and defaults to two
recursive generations. Before a related query enters the next generation, the
Extension compares its local sentence embedding with the seed and rejects
off-topic branches below the pinned similarity threshold. If semantic inference
fails during a running batch, Mining falls back to a strict shared-topic-token
rule.

A candidate qualifies when its recent average is materially above its early
baseline, its latest point still shows meaningful growth, and its latest value
reaches the configured percentage of the seed reference. An optional reference
override can be supplied by the Companion Skill. Neither mode estimates
absolute volume. Every result still needs separate validation for intent,
current search results, competition, seasonality, and business value.

The semantic model, runtime, and WebAssembly engine are included in the release
ZIP. Keyword text and embeddings remain on the device; no Indie Keyword Finder
API or model service is contacted.

Opening the Side Panel initializes the packaged model before Mining can start.
The model runs in a hidden extension document because ONNX Runtime cannot
dynamically initialize WebAssembly inside a Manifest V3 service worker. The
Discover button remains disabled until initialization succeeds. The Mining
screen shows the current packaged-file/runtime phase, percentage, and bytes
read; Settings also shows any exact initialization error, pinned model revision,
runtime, execution provider, vector dimensions, initialization time, and
bounded embedding-cache count.

## Install the Extension locally

Requirements: Chrome 114+ and Node.js 20+.

```bash
npm run verify
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `dist/chrome-extension`.
5. Click the Indie Keyword Finder toolbar icon.

Chrome controls whether the Side Panel appears on the left or right. Change
that preference from Chrome's Side Panel controls; the Extension cannot force
the physical side.

## Use the Companion Skill

The repository-local Skill is discovered from:

```text
.agents/skills/indie-keyword-finder
```

Invoke it with a request such as:

```text
Use $indie-keyword-finder to discover rising query opportunities for "ai agents"
in the United States over the past 30 days.
```

The Skill can be copied and installed independently. Its generated runner is
self-contained; `npm run check` verifies that it still matches the shared
Mining Core. Unlike the Extension, the Skill ZIP does not bundle the 45 MB
browser inference runtime and model. Its workflow supplies an explicitly
reviewed `allowedRelatedKeywords` subset before each recursive transition.

## Development

```bash
npm run generate:skill
npm run check
npm test
npm run build
npm run package
```

Repository modules:

```text
apps/chrome-extension/                 Chrome adapter and UI
packages/mining-core/                  Shared deterministic Mining module
.agents/skills/indie-keyword-finder/   Independently installable Skill
tests/                                 Cross-artifact contracts and fixtures
tooling/                               Build, validation, and packaging
prototypes/                            Design evidence; excluded from releases
```

Release artifacts are written to `dist/release`. The Extension ZIP contains
`manifest.json` at its root and excludes prototypes, tests, and repository
documentation.

## Privacy and permissions

Read [PRIVACY.md](PRIVACY.md) for the complete data-flow description.

The Extension has no Indie Keyword Finder backend, telemetry, advertising SDK,
or account system. It communicates with Google Trends to perform the
user-requested research and opens other destinations only after an explicit
user action.

## Contributing and security

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [GOVERNANCE.md](GOVERNANCE.md)

## License and identity

Code is licensed under the [Apache License 2.0](LICENSE). See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[TRADEMARKS.md](TRADEMARKS.md) for attribution and brand-use boundaries.

Indie Keyword Finder is an independent project. It is not affiliated with,
endorsed by, or sponsored by Google. Google Trends and Chrome are trademarks
of Google LLC.
