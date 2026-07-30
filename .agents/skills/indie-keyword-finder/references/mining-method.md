# Mining method and payload contract

## Contents

- Signal rule
- Session loop
- Observation contract
- Browser acquisition notes
- Interpretation limits

## Signal rule

The first Google Trends request contains only the seed. Later requests contain
that same seed as the reference series followed by up to four candidate series;
there is no unrelated hidden reference term. A candidate qualifies when:

1. its latest-three-point average is at least 1.5 times its early-window
   average;
2. its latest point has gained at least 10% (and at least two normalized
   points) from the start of that recent window; and
3. its latest value, divided by the reference's latest value and expressed as a
   percentage, meets the configured threshold.

An explicit reference override can replace the seed anchor. If the latest
reference value is zero, a positive candidate value produces an infinite ratio
and a zero candidate value produces zero. The runner still requires the other
conditions.

The rule is a heuristic for early relative movement. It is not a search-volume
estimate.

## Session loop

The deterministic session owns:

- normalized root keywords;
- the pending queue;
- current batch;
- related and effective keyword sets;
- processed count and cap;
- reference keyword, country, time range, depth, breadth, and threshold;
- status and timestamps.

The initial transition may select up to five roots because the automatic
reference is one of them. Later transitions select at most four candidates
because Google Trends accepts five compared terms and the seed occupies the
first slot. Each related-query payload contributes at most five expansion
candidates. The default depth of two processes the seed, its children, and its
grandchildren, but does not enqueue a third generation.

Platform state—browser tabs, cookies, storage, network capture, timers, and
tool-specific handles—does not belong in the session.

## Observation contract

Pass this object to `scripts/mine.mjs advance`:

```json
{
  "session": {
    "status": "running",
    "currentBatch": ["candidate one"],
    "batchInFlight": true
  },
  "timelineData": [
    { "value": [20, 4] }
  ],
  "relatedPayloads": [
    {
      "default": {
        "rankedList": [
          { "rankedKeyword": [] },
          { "rankedKeyword": [{ "query": "next query" }] }
        ]
      }
    }
  ]
}
```

Use the complete `session` emitted by the previous runner command; the abbreviated
object above only illustrates the fields relevant to an observation.

`timelineData` is the `default.timelineData` array from the `multiline`
response. `relatedPayloads` contains the complete parsed payload for each
candidate-query `relatedsearches` response. Prefer the rising ranked list; the
runner falls back to the top list when rising is empty.

## Browser acquisition notes

Google Trends is a true external dependency and may change. Use the browser's
supported network inspection rather than copying visible chart pixels or
guessing private request tokens. Keep the Trends page and session active while
collecting a batch. Treat missing responses, changed payload shapes, 403, 429,
and server failures as explicit errors.

If structured response capture is unavailable, stop the recursive workflow.
Return the generated comparison URLs as a useful fallback and state that rising
qualification could not be completed in the current environment.

## Interpretation limits

Google Trends values are normalized relative interest. The seed reference—or
an optional explicit override—helps compare magnitudes inside the same request;
it does not turn the values into absolute search counts. Validate candidates
separately for:

- search intent;
- relevance to the user's product or audience;
- current results and competition;
- business value;
- seasonality and geographic bias.
