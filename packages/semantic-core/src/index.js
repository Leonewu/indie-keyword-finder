export const DEFAULT_SEMANTIC_THRESHOLD = 0.32;

export const SEMANTIC_MODEL_INFO = Object.freeze({
  id: "Xenova/all-MiniLM-L6-v2",
  name: "all-MiniLM-L6-v2",
  revision: "751bff37182d3f1213fa05d7196b954e230abad9",
  modelFile: "model_quantized.onnx",
  quantization: "Q8",
  dimensions: 384,
  runtime: "Transformers.js 3.7.6",
  executionProvider: "WASM",
});

const FALLBACK_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "for",
  "free",
  "in",
  "of",
  "online",
  "or",
  "the",
  "to",
  "tool",
  "with",
]);

// These words describe a generic product shape rather than the topic itself.
// They should not be enough on their own to keep a candidate in a topic tree.
const GENERIC_TOPIC_TOKENS = new Set([
  "app",
  "builder",
  "calculator",
  "checker",
  "converter",
  "creator",
  "editor",
  "generator",
  "guide",
  "maker",
  "online",
  "platform",
  "service",
  "software",
  "template",
  "tool",
  "website",
]);

function normalizedKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function topicTokens(keyword, { includeGeneric = false } = {}) {
  return new Set(
    normalizedKey(keyword)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 3 &&
          !FALLBACK_STOP_WORDS.has(token) &&
          (includeGeneric || !GENERIC_TOPIC_TOKENS.has(token)),
      ),
  );
}

function hasTopicAnchor(candidate, seedKeywords) {
  const candidateTokens = topicTokens(candidate);
  const seedTokens = new Set(
    seedKeywords.flatMap((keyword) => [...topicTokens(keyword)]),
  );
  // If the seed is itself generic, fall back to all non-stop-word tokens so
  // the guard does not reject every candidate for a generic seed.
  const usableSeedTokens =
    seedTokens.size > 0
      ? seedTokens
      : new Set(
          seedKeywords.flatMap((keyword) => [
            ...topicTokens(keyword, { includeGeneric: true }),
          ]),
        );
  return [...candidateTokens].some((token) => usableSeedTokens.has(token));
}

function boundedScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-1, Math.min(1, number));
}

export function cosineSimilarity(left, right) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length === 0 ||
    left.length !== right.length
  ) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Number(left[index]) || 0;
    const rightValue = Number(right[index]) || 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator > 0 ? boundedScore(dot / denominator) : 0;
}

export function scoreSemanticCandidates(
  seedKeywords,
  candidates,
  embeddingByKeyword,
) {
  const seedVectors = seedKeywords
    .map((keyword) => embeddingByKeyword[normalizedKey(keyword)])
    .filter(Array.isArray);
  const scores = {};

  for (const candidate of candidates) {
    const key = normalizedKey(candidate);
    const candidateVector = embeddingByKeyword[key];
    scores[key] =
      seedVectors.length > 0 && Array.isArray(candidateVector)
        ? Math.max(
            ...seedVectors.map((seedVector) =>
              cosineSimilarity(seedVector, candidateVector),
            ),
          )
        : 0;
  }

  return scores;
}

export function classifySemanticCandidates(
  candidates,
  scores,
  threshold = DEFAULT_SEMANTIC_THRESHOLD,
  { seedKeywords = [], parentKeywords = [], strongThreshold = 0.65 } = {},
) {
  const minimum = Number.isFinite(Number(threshold))
    ? Number(threshold)
    : DEFAULT_SEMANTIC_THRESHOLD;
  const accepted = [];
  const rejected = [];
  const reasons = {};
  const anchors = {};
  const contextKeywords = [...seedKeywords, ...parentKeywords];
  const hasContext = contextKeywords.length > 0;

  for (const candidate of candidates) {
    const key = normalizedKey(candidate);
    const score = Number(scores[key]) || 0;
    // Parent terms improve the embedding comparison, while the lexical guard
    // stays anchored to the original root topic to prevent recursive drift.
    const anchor = hasTopicAnchor(candidate, seedKeywords);
    const passesScore = score >= minimum;
    const passesGuard =
      !hasContext || score >= Number(strongThreshold) || anchor;
    anchors[key] = anchor;
    if (passesScore && passesGuard) {
      accepted.push(candidate);
      reasons[key] = "accepted";
    } else {
      rejected.push(candidate);
      reasons[key] = !passesScore
        ? "below-semantic-threshold"
        : "missing-topic-anchor";
    }
  }

  const result = { accepted, rejected };
  if (contextKeywords.length > 0) {
    result.reasons = reasons;
    result.anchors = anchors;
  }
  return result;
}

export function classifyWithLexicalFallback(seedKeywords, candidates) {
  const seedPhrases = seedKeywords.map(normalizedKey).filter(Boolean);
  const seedTokens = new Set(
    seedKeywords.flatMap((keyword) => [...topicTokens(keyword)]),
  );
  const accepted = [];
  const rejected = [];
  const scores = {};

  for (const candidate of candidates) {
    const key = normalizedKey(candidate);
    const candidateTokens = topicTokens(candidate);
    const phraseOverlap = seedPhrases.some(
      (seed) => key.includes(seed) || seed.includes(key),
    );
    const tokenOverlap = [...candidateTokens].some((token) => seedTokens.has(token));
    const relevant = phraseOverlap || tokenOverlap;
    scores[key] = relevant ? 1 : 0;
    (relevant ? accepted : rejected).push(candidate);
  }

  return { accepted, rejected, scores };
}
