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
- **Supporting research tools:** keyword lists, favorites, root sequences,
  batch Google Trends comparisons, and small inline actions on Trends pages.
- **Local-first storage:** keywords, settings, and Mining sessions stay in
  Chrome local storage.
- **Companion Skill:** run the same deterministic Mining model from
  `.agents/skills/indie-keyword-finder` without installing the Extension.
- **English and Chinese UI:** switch languages from Settings.

## How Mining works

Each batch compares one reference keyword with up to four candidates. A
candidate qualifies when its first two observed points are zero, its latest
three points do not decrease, and its latest value reaches the configured
percentage of the reference keyword's latest value.

The reference keyword is a relative anchor—not a volume lookup. Every result
still needs separate validation for intent, current search results, competition,
seasonality, and business value.

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
Mining Core.

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
