import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySemanticCandidates,
  classifyWithLexicalFallback,
  cosineSimilarity,
  scoreSemanticCandidates,
} from "../src/index.js";

test("calculates cosine similarity for normalized and invalid vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity([1], [1, 0]), 0);
});

test("scores a candidate against the closest seed topic", () => {
  const scores = scoreSemanticCandidates(
    ["trip planner", "route builder"],
    ["travel itinerary", "docker container"],
    {
      "trip planner": [1, 0],
      "route builder": [0.8, 0.2],
      "travel itinerary": [0.9, 0.1],
      "docker container": [0, 1],
    },
  );

  assert.ok(scores["travel itinerary"] > 0.99);
  assert.ok(scores["docker container"] < 0.25);
});

test("classifies candidates at the configured semantic threshold", () => {
  assert.deepEqual(
    classifySemanticCandidates(
      ["travel itinerary", "docker container"],
      {
        "travel itinerary": 0.63,
        "docker container": 0.08,
      },
      0.32,
    ),
    {
      accepted: ["travel itinerary"],
      rejected: ["docker container"],
    },
  );
});

test("fallback keeps lexical topic anchors and rejects unrelated drift", () => {
  assert.deepEqual(
    classifyWithLexicalFallback(
      ["itinerary generator"],
      [
        "travel itinerary template",
        "javascript libraries",
        "docker containerization",
      ],
    ),
    {
      accepted: ["travel itinerary template"],
      rejected: ["javascript libraries", "docker containerization"],
      scores: {
        "travel itinerary template": 1,
        "javascript libraries": 0,
        "docker containerization": 0,
      },
    },
  );
});
