export const DEFAULT_SEMANTIC_THRESHOLD = 0.32;

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

function normalizedKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
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
) {
  const minimum = Number.isFinite(Number(threshold))
    ? Number(threshold)
    : DEFAULT_SEMANTIC_THRESHOLD;
  const accepted = [];
  const rejected = [];

  for (const candidate of candidates) {
    const score = Number(scores[normalizedKey(candidate)]) || 0;
    (score >= minimum ? accepted : rejected).push(candidate);
  }

  return { accepted, rejected };
}

function topicTokens(keyword) {
  return new Set(
    normalizedKey(keyword)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 3 &&
          !FALLBACK_STOP_WORDS.has(token),
      ),
  );
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
    const tokenOverlap = [...candidateTokens].some((token) =>
      seedTokens.has(token),
    );
    const relevant = phraseOverlap || tokenOverlap;
    scores[key] = relevant ? 1 : 0;
    (relevant ? accepted : rejected).push(candidate);
  }

  return { accepted, rejected, scores };
}
