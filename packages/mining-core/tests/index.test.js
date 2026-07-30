import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMiningObservation,
  buildBatchTrendsUrls,
  buildTrendsUrl,
  createMiningSession,
  DEFAULT_SETTINGS,
  detectEffectiveKeywords,
  extractRelatedKeywords,
  normalizeKeywordInput,
  restoreMiningSession,
  selectNextMiningBatch,
  setMiningStatus,
  stripGoogleJsonPrefix,
  validateKeyword,
} from "../src/index.js";

test("normalizes pasted keyword lists and removes duplicates", () => {
  assert.deepEqual(
    normalizeKeywordInput(
      "image-to-text.html\nimage_to_text\n  Photo Tool ;photo tool",
    ),
    ["image to text", "Photo Tool"],
  );
});

test("validates candidate keyword constraints", () => {
  assert.equal(validateKeyword("short useful phrase"), true);
  assert.equal(validateKeyword("contains,comma"), false);
  assert.equal(validateKeyword("one two three four five six seven"), false);
  assert.equal(validateKeyword("x".repeat(101)), false);
});

test("builds a Google Trends URL with scope and encoded keywords", () => {
  const url = new URL(
    buildTrendsUrl(["gpts", "image tool"], {
      timeRange: "Past 7 Days",
      country: "United States",
    }),
  );

  assert.equal(url.origin, "https://trends.google.com");
  assert.equal(url.pathname, "/trends/explore");
  assert.equal(url.searchParams.get("date"), "now 7-d");
  assert.equal(url.searchParams.get("geo"), "US");
  assert.equal(url.searchParams.get("q"), "gpts,image tool");
});

test("splits batches around Google Trends' five-term limit", () => {
  const keywords = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const result = buildBatchTrendsUrls(
    keywords,
    "gpts",
    { timeRange: "Past 30 Days", country: "Global" },
    2,
  );

  assert.equal(result.urls.length, 2);
  assert.deepEqual(result.used, ["a", "b", "c", "d", "e", "f", "g", "h"]);
  assert.equal(new URL(result.urls[0]).searchParams.get("q"), "gpts,a,b,c,d");
});

test("uses all five term slots when no comparison is selected", () => {
  const result = buildBatchTrendsUrls(
    ["a", "b", "c", "d", "e", "f"],
    "empty",
    { timeRange: "Past 12 Months", country: "Global" },
    1,
  );
  assert.deepEqual(result.used, ["a", "b", "c", "d", "e"]);
});

test("starts Mining without a hidden comparison keyword", () => {
  assert.equal(DEFAULT_SETTINGS.comparisonKeyword, "empty");

  const session = createMiningSession({
    keywords: ["one", "two", "three", "four", "five"],
  });
  const selected = selectNextMiningBatch(session);

  assert.equal(session.comparisonKeyword, "empty");
  assert.deepEqual(selected.batch, ["one", "two", "three", "four", "five"]);
});

test("parses Google Trends' anti-XSSI prefix", () => {
  assert.deepEqual(stripGoogleJsonPrefix(`)]}',\n{"ok":true}`), { ok: true });
});

test("detects candidates that start at zero, rise recently, and clear threshold", () => {
  const timeline = Array.from({ length: 10 }, (_, index) => ({
    value: [
      10,
      index < 2 ? 0 : index < 7 ? 1 : [5, 6, 7][index - 7],
      index < 2 ? 1 : index < 7 ? 2 : [7, 6, 5][index - 7],
    ],
  }));

  assert.deepEqual(
    detectEffectiveKeywords(timeline, ["rising tool", "falling tool"], 50),
    ["rising tool"],
  );
});

test("detects normalized candidate signals without a comparison series", () => {
  const timeline = Array.from({ length: 10 }, (_, index) => ({
    value: [
      index < 2 ? 0 : index < 7 ? 1 : [18, 20, 24][index - 7],
      index < 2 ? 0 : index < 7 ? 2 : [28, 25, 31][index - 7],
    ],
  }));

  assert.deepEqual(
    detectEffectiveKeywords(
      timeline,
      ["rising tool", "uneven tool"],
      20,
      { hasReference: false },
    ),
    ["rising tool"],
  );
});

test("prefers rising related queries and deduplicates exclusions", () => {
  const payloads = [
    {
      default: {
        rankedList: [
          { rankedKeyword: [{ query: "top only" }] },
          {
            rankedKeyword: [
              { query: "new tool" },
              { query: "Existing" },
              { query: "contains,comma" },
            ],
          },
        ],
      },
    },
    {
      default: {
        rankedList: [
          { rankedKeyword: [{ query: "fallback tool" }] },
          { rankedKeyword: [] },
        ],
      },
    },
  ];

  assert.deepEqual(extractRelatedKeywords(payloads, ["existing"]), [
    "new tool",
    "fallback tool",
  ]);
});

test("runs a Mining batch through the public session interface", () => {
  const created = createMiningSession(
    {
      keywords: ["seed one", "seed two"],
      comparisonKeyword: "baseline",
      maxKeywords: 4,
      threshold: 50,
    },
    100,
  );
  const selected = selectNextMiningBatch(created, 200);

  assert.deepEqual(selected.batch, ["seed one", "seed two"]);
  assert.equal(selected.session.batchInFlight, true);

  const timeline = Array.from({ length: 10 }, (_, index) => ({
    value: [
      10,
      index < 2 ? 0 : index < 7 ? 1 : [5, 6, 7][index - 7],
      index < 2 ? 0 : index < 7 ? 1 : [1, 2, 3][index - 7],
    ],
  }));
  const observed = applyMiningObservation(
    selected.session,
    {
      timelineData: timeline,
      relatedPayloads: [
        {
          default: {
            rankedList: [
              { rankedKeyword: [] },
              {
                rankedKeyword: [
                  { query: "fresh query" },
                  { query: "Seed One" },
                ],
              },
            ],
          },
        },
      ],
    },
    300,
  );

  assert.deepEqual(observed.addedEffective, ["seed one"]);
  assert.deepEqual(observed.addedRelated, ["fresh query"]);
  assert.deepEqual(observed.session.queue, ["fresh query"]);
  assert.equal(observed.session.processed, 2);
  assert.equal(observed.session.status, "running");
});

test("restores interrupted work as paused without duplicating a batch", () => {
  const created = createMiningSession({
    keywords: ["one", "two", "three", "four", "five"],
    comparisonKeyword: "baseline",
  });
  const selected = selectNextMiningBatch(created);
  const restored = restoreMiningSession(selected.session, 500);

  assert.equal(restored.status, "paused");
  assert.equal(restored.batchInFlight, false);
  assert.deepEqual(restored.currentBatch, []);
  assert.deepEqual(restored.queue, ["one", "two", "three", "four", "five"]);
});

test("rejects unsupported status transitions at the Mining interface", () => {
  const created = createMiningSession({
    keywords: ["one"],
    comparisonKeyword: "baseline",
  });
  assert.throws(
    () => setMiningStatus(created, "waiting"),
    /Unsupported Mining status/,
  );
});
