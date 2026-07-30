---
name: indie-keyword-finder
description: Discover early rising search-query opportunities from one or more seed keywords using Google Trends related-query and time-series signals. Use when researching emerging SEO keywords, expanding a seed into related queries, reproducing Indie Keyword Finder Mining without the Chrome Extension, or explaining and validating the relative-signal method.
---

# Indie Keyword Finder

Discover candidate queries worth further SEO validation. Keep the output honest:
the workflow finds relative Google Trends signals, not exact volume, keyword
difficulty, traffic forecasts, or guaranteed ranking opportunities.

## Choose the workflow

- For a live recursive Mining run, follow **Mine live signals**.
- For a deterministic session transition from captured JSON, run
  `scripts/mine.mjs`.
- For methodology or payload contracts, read
  [references/mining-method.md](references/mining-method.md).
- If the available browser cannot inspect Google Trends network responses, do
  not invent results. Produce batch Trends URLs and explain the acquisition
  limitation.

## Mine live signals

1. Confirm the seed, country/region, time range, depth, per-keyword breadth,
   result cap, and threshold. Default to `Global`, `Past 30 Days`, `2`, `5`,
   `200`, and `20` when the user has no preference. The seed becomes the
   automatic reference after its initial discovery request. Add `--comparison`
   only when the user asks to override that anchor.
2. Create the first deterministic session:

   ```bash
   node scripts/mine.mjs create \
     --seed "ai agents" \
     --country "Global" \
     --time "Past 30 Days" \
     --depth 2 \
     --breadth 5 \
     --max 200 \
     --threshold 20
   ```

3. Open `nextUrl` with an available browser-control tool. Use structured network
   inspection to capture the Google Trends `multiline` response and the
   candidate `relatedsearches` query responses. Keep the batch order unchanged.
4. Save a temporary observation object outside the Skill directory:

   ```json
   {
     "session": {},
     "timelineData": [],
     "relatedPayloads": []
   }
   ```

5. Advance the same session:

   ```bash
   node scripts/mine.mjs advance --input /absolute/path/observation.json
   ```

6. Repeat with each returned `nextUrl` until `complete` is true, the requested
   cap is reached, the user stops, or Google Trends returns an actionable
   failure.
7. Return a deduplicated list of `session.effectiveKeywords`, the scope and
   threshold, and a short caveat that every candidate still needs independent
   intent, competition, and business-value validation.

## Guardrails

- Never describe the relative ratio as monthly search volume.
- Never promise rankings, revenue, traffic, or a guaranteed opportunity.
- Do not bypass authentication, rate limits, bot checks, CAPTCHAs, or access
  controls.
- Stop after bounded retries and report 403, 429, malformed data, missing
  widgets, or changed endpoints explicitly.
- Keep session and observation files free of cookies, tokens, request headers,
  personal identifiers, and other secrets.
- Use only data needed for the user's requested research and avoid retaining
  browsing data after the run.

## Interpret results

Prioritize candidates that:

- satisfy the deterministic relative-signal rule;
- are newly present in related queries;
- express a distinct, plausible search intent;
- remain relevant to the seed and audience.

Separate evidence from judgment. Label the signal as observed, and label intent,
commercial fit, or content potential as interpretation requiring further
validation.
