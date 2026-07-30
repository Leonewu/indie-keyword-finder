export const DATE_OPTIONS = Object.freeze({
  "Past 1 Day": "now 1-d",
  "Past 7 Days": "now 7-d",
  "Past 30 Days": "today 1-m",
  "Past 90 Days": "today 3-m",
  "Past 12 Months": "",
});

export const GEO_OPTIONS = Object.freeze({
  Global: "",
  "United States": "US",
  Japan: "JP",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Canada: "CA",
  Australia: "AU",
  India: "IN",
  China: "CN",
});

export const COMPARISON_KEYWORDS = Object.freeze([
  ["empty", "No comparison"],
  ["weather", "weather · broad reference"],
  ["chatgpt", "chatgpt · strong reference"],
  ["ai tools", "ai tools · medium reference"],
  ["image converter", "image converter · utility reference"],
  ["keyword research", "keyword research · SEO reference"],
]);

export const DEFAULT_ROOT_KEYWORDS = Object.freeze([
  "Translator",
  "Processor",
  "Designer",
  "Compiler",
  "Analyzer",
  "Evaluator",
  "Sender",
  "Receiver",
  "Interpreter",
  "Uploader",
  "Calculator",
  "Generator",
  "Sample",
  "Template",
  "Format",
  "Builder",
  "Scheme",
  "Pattern",
  "Checker",
  "Detector",
  "Scraper",
  "Manager",
  "Example",
  "Explorer",
  "Dashboard",
  "Planner",
  "Tracker",
  "Recorder",
  "Optimizer",
  "Scheduler",
  "Converter",
  "Viewer",
  "Extractor",
  "Convert",
  "Monitor",
  "Notifier",
  "Verifier",
  "Simulator",
  "Assistant",
  "Constructor",
  "Comparator",
  "Navigator",
  "Syncer",
  "Connector",
  "Online",
  "Cataloger",
  "Responder",
  "Downloader",
  "Maker",
  "Creator",
  "Editor",
  "Guide",
]);

export const DEFAULT_SETTINGS = Object.freeze({
  country: "Global",
  timeRange: "Past 30 Days",
  activeLibrary: "custom",
  maxTabs: 1,
  comparisonKeyword: "weather",
  maxKeywords: 200,
  threshold: 20,
});

export function uniqueKeywords(keywords) {
  const seen = new Set();
  const result = [];

  for (const keyword of keywords) {
    const normalized = String(keyword ?? "").trim();
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function normalizeKeywordInput(input) {
  return uniqueKeywords(
    String(input ?? "")
      .replace(/\.html\b/gi, "")
      .replace(/[-_]/g, " ")
      .split(/[;\n\r]+/)
      .map((keyword) => keyword.replace(/\s+/g, " ").trim()),
  );
}

export function validateKeyword(keyword) {
  const normalized = String(keyword ?? "").trim();
  if (!normalized || normalized.length > 100 || normalized.includes(",")) {
    return false;
  }
  return normalized.split(/\s+/).length <= 6;
}

export function comparisonTerms(comparisonKeyword) {
  const value = String(comparisonKeyword ?? "").trim();
  return !value || value === "empty" ? [] : [value];
}

export function keywordsPerTab(comparisonKeyword) {
  return Math.max(1, 5 - comparisonTerms(comparisonKeyword).length);
}

export function buildTrendsUrl(
  keywords,
  {
    timeRange = DEFAULT_SETTINGS.timeRange,
    country = DEFAULT_SETTINGS.country,
  } = {},
) {
  const cleaned = uniqueKeywords(keywords).slice(0, 5);
  if (cleaned.length === 0) {
    throw new Error("At least one keyword is required.");
  }

  const parts = [];
  const date = DATE_OPTIONS[timeRange] ?? "";
  const geo = GEO_OPTIONS[country] ?? "";

  if (date) parts.push(`date=${encodeURIComponent(date)}`);
  if (geo) parts.push(`geo=${encodeURIComponent(geo)}`);
  parts.push(`q=${cleaned.map((keyword) => encodeURIComponent(keyword)).join(",")}`);
  parts.push("hl=en-US");

  return `https://trends.google.com/trends/explore?${parts.join("&")}`;
}

export function buildBatchTrendsUrls(
  keywords,
  comparisonKeyword,
  settings,
  maxTabs,
) {
  const candidates = uniqueKeywords(keywords);
  const baseline = comparisonTerms(comparisonKeyword);
  const perTab = keywordsPerTab(comparisonKeyword);
  const limit = Math.max(1, Math.min(20, Number(maxTabs) || 1));
  const urls = [];
  const used = [];

  for (let index = 0; index < limit; index += 1) {
    const selected = candidates.slice(index * perTab, (index + 1) * perTab);
    if (selected.length === 0) break;
    urls.push(buildTrendsUrl([...baseline, ...selected], settings));
    used.push(...selected);
  }

  return { urls, used };
}

export function stripGoogleJsonPrefix(text) {
  const source = String(text ?? "").trimStart();
  const brace = source.search(/[\[{]/);
  if (brace === -1) throw new Error("Google Trends returned invalid JSON.");
  return JSON.parse(source.slice(brace));
}

export function detectEffectiveKeywords(
  timelineData,
  candidateKeywords,
  threshold,
) {
  if (!Array.isArray(timelineData) || timelineData.length < 10) return [];

  const values = timelineData.map((point) =>
    Array.isArray(point?.value) ? point.value.map(Number) : [],
  );
  const baseline = values.map((row) => Number(row[0]) || 0);
  const baselineLast = baseline.at(-1) ?? 0;
  const effective = [];

  candidateKeywords.forEach((keyword, candidateIndex) => {
    const columnIndex = candidateIndex + 1;
    const series = values.map((row) => Number(row[columnIndex]) || 0);
    if (series.length !== values.length) return;

    const startsAtZero = series.slice(0, 2).every((value) => value === 0);
    const recent = series.slice(-3);
    const nonDecreasing = recent.every(
      (value, index) => index === 0 || value >= recent[index - 1],
    );
    const lastValue = series.at(-1) ?? 0;
    const ratio = baselineLast === 0
      ? lastValue > 0
        ? Number.POSITIVE_INFINITY
        : 0
      : (lastValue / baselineLast) * 100;

    if (startsAtZero && nonDecreasing && ratio >= Number(threshold)) {
      effective.push(keyword);
    }
  });

  return effective;
}

export function extractRelatedKeywords(payloads, excludedKeywords = []) {
  const excluded = new Set(
    excludedKeywords.map((keyword) => String(keyword).toLocaleLowerCase()),
  );
  const result = [];

  for (const payload of payloads) {
    const rankedLists = payload?.default?.rankedList;
    if (!Array.isArray(rankedLists)) continue;
    const rising = rankedLists[1]?.rankedKeyword ?? [];
    const top = rankedLists[0]?.rankedKeyword ?? [];
    const selected = rising.length > 0 ? rising : top;

    for (const item of selected) {
      const keyword = String(item?.query ?? "").trim();
      const key = keyword.toLocaleLowerCase();
      if (!validateKeyword(keyword) || excluded.has(key)) continue;
      excluded.add(key);
      result.push(keyword);
    }
  }

  return result;
}

function boundedNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

function sessionTimestamp(now) {
  const value = Number(now);
  return Number.isFinite(value) ? value : Date.now();
}

/**
 * Create the JSON-serializable source of truth for one Mining run.
 *
 * The returned object deliberately contains no browser, tab, timer, storage, or
 * transport state. Those concerns belong to platform adapters.
 */
export function createMiningSession(
  {
    keywords,
    comparisonKeyword,
    timeRange = "Past 7 Days",
    country = DEFAULT_SETTINGS.country,
    maxKeywords = DEFAULT_SETTINGS.maxKeywords,
    threshold = DEFAULT_SETTINGS.threshold,
  },
  now = Date.now(),
) {
  const rootKeywords = uniqueKeywords(keywords ?? []);
  const comparison = String(comparisonKeyword ?? "").trim();

  if (rootKeywords.length === 0) {
    throw new Error("Add at least one seed keyword before starting.");
  }
  if (!comparison || comparison === "empty") {
    throw new Error("Mining requires a comparison keyword.");
  }

  const timestamp = sessionTimestamp(now);
  return {
    schemaVersion: 1,
    status: "running",
    rootKeywords,
    queue: [...rootKeywords],
    relatedKeywords: [],
    effectiveKeywords: [],
    processed: 0,
    maxKeywords: boundedNumber(maxKeywords, 200, 1, 2_000),
    threshold: boundedNumber(threshold, 20, 1, 10_000),
    timeRange: DATE_OPTIONS[timeRange] === undefined ? "Past 7 Days" : timeRange,
    country: GEO_OPTIONS[country] === undefined ? "Global" : country,
    comparisonKeyword: comparison,
    currentBatch: [],
    batchInFlight: false,
    startedAt: timestamp,
    updatedAt: timestamp,
    lastError: null,
  };
}

export function publicMiningSession(session, now = Date.now()) {
  if (!session) return null;
  return {
    schemaVersion: session.schemaVersion ?? 1,
    status: session.status,
    rootKeywords: [...(session.rootKeywords ?? [])],
    relatedKeywords: [...(session.relatedKeywords ?? [])],
    effectiveKeywords: [...(session.effectiveKeywords ?? [])],
    processed: Number(session.processed) || 0,
    maxKeywords: Number(session.maxKeywords) || 0,
    threshold: Number(session.threshold) || 0,
    timeRange: session.timeRange,
    country: session.country,
    comparisonKeyword: session.comparisonKeyword,
    currentBatch: [...(session.currentBatch ?? [])],
    queued: Array.isArray(session.queue) ? session.queue.length : 0,
    startedAt: session.startedAt,
    updatedAt: sessionTimestamp(now),
    lastError: session.lastError ?? null,
  };
}

export function selectNextMiningBatch(session, now = Date.now()) {
  if (!session || session.status !== "running" || session.batchInFlight) {
    return { session, batch: [], complete: session?.status === "complete" };
  }

  const capacity = session.maxKeywords - session.processed;
  const queue = [...session.queue];
  if (capacity <= 0 || queue.length === 0) {
    return {
      session: {
        ...session,
        status: "complete",
        currentBatch: [],
        batchInFlight: false,
        updatedAt: sessionTimestamp(now),
      },
      batch: [],
      complete: true,
    };
  }

  const batch = queue.splice(0, Math.min(4, capacity, queue.length));
  return {
    session: {
      ...session,
      queue,
      currentBatch: batch,
      batchInFlight: true,
      updatedAt: sessionTimestamp(now),
      lastError: null,
    },
    batch,
    complete: false,
  };
}

export function applyMiningObservation(
  session,
  { timelineData, relatedPayloads = [] },
  now = Date.now(),
) {
  if (!session?.batchInFlight || session.currentBatch.length === 0) {
    throw new Error("No Mining batch is waiting for an observation.");
  }
  if (!Array.isArray(timelineData)) {
    throw new Error("The Mining observation has no timeline data.");
  }

  const effective = detectEffectiveKeywords(
    timelineData,
    session.currentBatch,
    session.threshold,
  );
  const effectiveKeywords = uniqueKeywords([
    ...session.effectiveKeywords,
    ...effective,
  ]);
  const related = extractRelatedKeywords(relatedPayloads, [
    session.comparisonKeyword,
    ...session.rootKeywords,
    ...session.relatedKeywords,
  ]);
  const relatedKeywords = uniqueKeywords([
    ...session.relatedKeywords,
    ...related,
  ]);

  const queued = new Set(
    [
      ...session.rootKeywords,
      ...session.queue,
      ...session.currentBatch,
    ].map((keyword) => keyword.toLocaleLowerCase()),
  );
  const queue = [...session.queue];
  for (const keyword of related) {
    const key = keyword.toLocaleLowerCase();
    if (queued.has(key)) continue;
    queued.add(key);
    queue.push(keyword);
  }

  const processed = session.processed + session.currentBatch.length;
  const complete = processed >= session.maxKeywords || queue.length === 0;
  return {
    session: {
      ...session,
      status: complete ? "complete" : session.status,
      queue,
      relatedKeywords,
      effectiveKeywords,
      processed,
      currentBatch: [],
      batchInFlight: false,
      updatedAt: sessionTimestamp(now),
      lastError: null,
    },
    addedRelated: related,
    addedEffective: effective,
    complete,
  };
}

export function setMiningStatus(session, status, now = Date.now()) {
  if (!session) return null;
  if (!["running", "paused", "complete", "error"].includes(status)) {
    throw new Error(`Unsupported Mining status: ${status}`);
  }
  return {
    ...session,
    status,
    updatedAt: sessionTimestamp(now),
  };
}

export function failMiningSession(session, error, now = Date.now()) {
  if (!session) return null;
  return {
    ...session,
    status: "error",
    batchInFlight: false,
    currentBatch: [],
    lastError: error instanceof Error ? error.message : String(error),
    updatedAt: sessionTimestamp(now),
  };
}

export function restoreMiningSession(saved, now = Date.now()) {
  if (!saved || !["running", "paused"].includes(saved.status)) return null;
  return {
    ...saved,
    schemaVersion: 1,
    status: "paused",
    queue: uniqueKeywords([
      ...(saved.currentBatch ?? []),
      ...(saved.queue ?? []),
    ]),
    currentBatch: [],
    batchInFlight: false,
    updatedAt: sessionTimestamp(now),
  };
}
