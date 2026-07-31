import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMiningObservation,
  buildBatchTrendsUrls,
  buildTrendsUrl,
  createMiningSession,
  DEFAULT_SETTINGS,
  detectEffectiveKeywords,
  evaluateEffectiveKeywords,
  extractRelatedKeywords,
  normalizeKeywordInput,
  publicMiningSession,
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

test("uses the seed as the automatic Mining reference without adding a hidden term", () => {
  assert.equal(DEFAULT_SETTINGS.comparisonKeyword, "empty");

  const session = createMiningSession({
    keywords: ["one", "two", "three", "four", "five"],
  });
  const selected = selectNextMiningBatch(session);

  assert.equal(session.comparisonKeyword, "empty");
  assert.equal(session.referenceKeyword, "one");
  assert.deepEqual(selected.batch, ["one", "two", "three", "four", "five"]);
  assert.equal(selected.session.currentDepth, 0);
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
      index < 2 ? 0 : index < 7 ? 2 : [31, 25, 28][index - 7],
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

test("detects material growth from a low non-zero baseline", () => {
  const timeline = Array.from({ length: 10 }, (_, index) => ({
    value: [
      20,
      index < 3 ? [4, 5, 4][index] : index < 7 ? 6 : [12, 15, 18][index - 7],
      index < 3 ? 10 : index < 7 ? 11 : [12, 11, 12][index - 7],
    ],
  }));

  assert.deepEqual(
    detectEffectiveKeywords(
      timeline,
      ["accelerating tool", "flat tool"],
      20,
    ),
    ["accelerating tool"],
  );
});

test("supports demand mode and explains a non-growing candidate", () => {
  const timeline = Array.from({ length: 10 }, () => ({
    value: [50, 20],
  }));
  const evaluation = evaluateEffectiveKeywords(
    timeline,
    ["steady tool"],
    20,
    { signalMode: "demand", hasReference: true },
  )[0];

  assert.equal(evaluation.qualified, true);
  assert.equal(evaluation.reason, "qualified");
  assert.equal(evaluation.materiallyGrowing, false);
  assert.equal(evaluation.score, 40);
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

test("limits expansion candidates per related-query payload", () => {
  const payload = {
    default: {
      rankedList: [
        { rankedKeyword: [] },
        {
          rankedKeyword: [
            { query: "one" },
            { query: "two" },
            { query: "three" },
          ],
        },
      ],
    },
  };

  assert.deepEqual(
    extractRelatedKeywords([payload], [], { limitPerPayload: 2 }),
    ["one", "two"],
  );
});

test("only enqueues related queries accepted by the semantic filter", () => {
  const created = createMiningSession({
    keywords: ["itinerary generator"],
    maxDepth: 2,
    semanticMode: "local",
  });
  const selected = selectNextMiningBatch(created);
  const relatedPayloads = [
    {
      default: {
        rankedList: [
          { rankedKeyword: [] },
          {
            rankedKeyword: [
              { query: "travel itinerary template" },
              { query: "docker containerization" },
            ],
          },
        ],
      },
    },
  ];
  const observed = applyMiningObservation(selected.session, {
    timelineData: Array.from({ length: 10 }, () => ({ value: [10] })),
    relatedPayloads,
    allowedRelatedKeywords: ["travel itinerary template"],
    semanticScores: {
      "travel itinerary template": 0.63,
      "docker containerization": 0.08,
    },
  });

  assert.deepEqual(observed.session.relatedKeywords, [
    "travel itinerary template",
    "docker containerization",
  ]);
  assert.deepEqual(observed.session.queue, [
    "travel itinerary template",
  ]);
  assert.deepEqual(observed.addedRelevant, [
    "travel itinerary template",
  ]);
  assert.deepEqual(observed.rejectedSemantic, [
    "docker containerization",
  ]);
  assert.equal(observed.session.semanticRejectedKeywords.length, 1);
});

test("preserves a null current depth in the public session", () => {
  const session = createMiningSession({ keywords: ["seed"] });

  assert.equal(publicMiningSession(session).currentDepth, null);
});

test("anchors later batches to the seed and limits breadth", () => {
  const created = createMiningSession({
    keywords: ["itinerary generator"],
    maxDepth: 2,
    maxRelatedPerKeyword: 5,
  });
  const first = selectNextMiningBatch(created);
  const payload = {
    default: {
      rankedList: [
        { rankedKeyword: [] },
        {
          rankedKeyword: Array.from({ length: 8 }, (_, index) => ({
            query: `related ${index + 1}`,
          })),
        },
      ],
    },
  };
  const observed = applyMiningObservation(first.session, {
    timelineData: Array.from({ length: 10 }, () => ({ value: [10] })),
    relatedPayloads: [payload],
  });
  const second = selectNextMiningBatch(observed.session);

  assert.equal(observed.session.batchesProcessed, 1);
  assert.deepEqual(observed.session.queue, [
    "related 1",
    "related 2",
    "related 3",
    "related 4",
    "related 5",
  ]);
  assert.equal(observed.session.keywordDepths["related 1"], 1);
  assert.deepEqual(second.batch, [
    "related 1",
    "related 2",
    "related 3",
    "related 4",
  ]);
  assert.equal(
    new URL(
      buildTrendsUrl(
        [second.session.referenceKeyword, ...second.batch],
        second.session,
      ),
    ).searchParams.get("q"),
    "itinerary generator,related 1,related 2,related 3,related 4",
  );
});

test("does not enqueue related queries beyond the configured depth", () => {
  const created = createMiningSession({
    keywords: ["seed"],
    maxDepth: 1,
    maxRelatedPerKeyword: 1,
  });
  const first = selectNextMiningBatch(created);
  const firstObserved = applyMiningObservation(first.session, {
    timelineData: Array.from({ length: 10 }, () => ({ value: [10] })),
    relatedPayloads: [
      {
        default: {
          rankedList: [
            { rankedKeyword: [] },
            { rankedKeyword: [{ query: "child" }] },
          ],
        },
      },
    ],
  });
  const second = selectNextMiningBatch(firstObserved.session);
  const secondObserved = applyMiningObservation(second.session, {
    timelineData: Array.from({ length: 10 }, () => ({ value: [10, 10] })),
    relatedPayloads: [
      {
        default: {
          rankedList: [
            { rankedKeyword: [] },
            { rankedKeyword: [{ query: "grandchild" }] },
          ],
        },
      },
    ],
  });

  assert.deepEqual(secondObserved.session.relatedKeywords, [
    "child",
    "grandchild",
  ]);
  assert.deepEqual(secondObserved.session.queue, []);
  assert.equal(secondObserved.session.status, "complete");
  assert.equal(secondObserved.session.batchesProcessed, 2);
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

  assert.deepEqual(observed.addedEffective, []);
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
