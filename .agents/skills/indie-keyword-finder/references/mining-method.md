# Mining method and payload contract

## Contents

- Signal rule
- Session loop
- Observation contract
- Browser acquisition notes
- Interpretation limits

## Signal rule

Each Google Trends comparison contains one reference series followed by up to
four candidate series. A candidate qualifies when:

1. its first two observed values are both zero;
2. its latest three values are non-decreasing; and
3. its latest value divided by the reference keyword's latest value, expressed
   as a percentage, meets the configured threshold.

If the latest reference value is zero, a positive candidate value produces an
infinite ratio and a zero candidate value produces zero. The runner still
requires the other conditions.

The rule is a heuristic for early relative movement. It is not a search-volume
estimate.

## Session loop

The deterministic session owns:

- normalized root keywords;
- the pending queue;
- current batch;
- related and effective keyword sets;
- processed count and cap;
- reference keyword, country, time range, and threshold;
- status and timestamps.

One transition selects at most four candidates because Google Trends accepts at
most five compared terms and the first term is the reference. One observation
transition qualifies the current batch, adds new related queries, deduplicates
the queue, and completes or returns the next batch.

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
    { "value": [10, 0] }
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

Google Trends values are normalized relative interest. The reference keyword
helps compare magnitudes inside the same request; it does not turn the values
into absolute search counts. Validate candidates separately for:

- search intent;
- relevance to the user's product or audience;
- current results and competition;
- business value;
- seasonality and geographic bias.
