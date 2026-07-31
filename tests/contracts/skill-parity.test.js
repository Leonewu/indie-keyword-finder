import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import {
  buildTrendsUrl,
  createMiningSession,
  selectNextMiningBatch,
} from "../../packages/mining-core/src/index.js";

const execute = promisify(execFile);
const runner = new URL(
  "../../.agents/skills/indie-keyword-finder/scripts/mine.mjs",
  import.meta.url,
);

test("Companion Skill runner uses the same first-batch contract", async () => {
  const { stdout } = await execute(process.execPath, [
    runner.pathname,
    "create",
    "--seed",
    "ai agents",
    "--comparison",
    "weather",
    "--country",
    "United States",
    "--time",
    "Past 30 Days",
    "--max",
    "8",
    "--threshold",
    "20",
  ]);
  const actual = JSON.parse(stdout);
  const expected = selectNextMiningBatch(
    createMiningSession({
      keywords: ["ai agents"],
      comparisonKeyword: "weather",
      country: "United States",
      timeRange: "Past 30 Days",
      maxKeywords: 8,
      threshold: 20,
    }),
  );

  assert.deepEqual(actual.nextBatch, expected.batch);
  assert.equal(actual.session.status, expected.session.status);
  assert.equal(actual.session.threshold, expected.session.threshold);
  assert.equal(actual.session.maxKeywords, expected.session.maxKeywords);
  assert.equal(actual.session.referenceKeyword, "weather");
  assert.equal(
    actual.nextUrl,
    buildTrendsUrl(["weather", "ai agents"], expected.session),
  );
});

test("Companion Skill defaults to a seed-only Trends request", async () => {
  const { stdout } = await execute(process.execPath, [
    runner.pathname,
    "create",
    "--seed",
    "ai agents",
  ]);
  const actual = JSON.parse(stdout);

  assert.equal(actual.session.comparisonKeyword, "empty");
  assert.equal(actual.session.referenceKeyword, "ai agents");
  assert.equal(
    new URL(actual.nextUrl).searchParams.get("q"),
    "ai agents",
  );
});
