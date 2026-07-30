import { env, pipeline } from "./vendor/transformers.min.js";
import {
  classifySemanticCandidates,
  classifyWithLexicalFallback,
  DEFAULT_SEMANTIC_THRESHOLD,
  scoreSemanticCandidates,
} from "./semantic-core.js";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_CACHE_KEY = "semanticEmbeddingCacheV1";
const MAX_CACHED_EMBEDDINGS = 300;

let extractorPromise = null;
let embeddingCachePromise = null;

function normalizedKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function uniquePhrases(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const phrase = String(value ?? "").trim();
    const key = normalizedKey(phrase);
    if (!phrase || seen.has(key)) continue;
    seen.add(key);
    result.push(phrase);
  }
  return result;
}

async function loadEmbeddingCache() {
  if (!embeddingCachePromise) {
    embeddingCachePromise = chrome.storage.local
      .get(EMBEDDING_CACHE_KEY)
      .then((result) => {
        const saved = result[EMBEDDING_CACHE_KEY];
        if (!saved || typeof saved !== "object") return {};
        return Object.fromEntries(
          Object.entries(saved).filter(
            ([, vector]) =>
              Array.isArray(vector) &&
              vector.length === 384 &&
              vector.every(Number.isFinite),
          ),
        );
      })
      .catch(() => ({}));
  }
  return embeddingCachePromise;
}

async function persistEmbeddingCache(cache) {
  const entries = Object.entries(cache);
  const bounded = Object.fromEntries(
    entries.slice(Math.max(0, entries.length - MAX_CACHED_EMBEDDINGS)),
  );
  embeddingCachePromise = Promise.resolve(bounded);
  await chrome.storage.local
    .set({ [EMBEDDING_CACHE_KEY]: bounded })
    .catch(() => {});
}

async function createExtractor() {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false;
  env.localModelPath = chrome.runtime.getURL("models/");
  env.backends.onnx.wasm.wasmPaths =
    chrome.runtime.getURL("vendor/");
  env.backends.onnx.wasm.numThreads = 1;

  return pipeline("feature-extraction", MODEL_ID, {
    device: "wasm",
    dtype: "q8",
    local_files_only: true,
  });
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = createExtractor().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }
  return extractorPromise;
}

async function embedKeywords(keywords) {
  const phrases = uniquePhrases(keywords);
  const cache = await loadEmbeddingCache();
  const missing = phrases.filter(
    (phrase) => !cache[normalizedKey(phrase)],
  );

  if (missing.length > 0) {
    const extractor = await getExtractor();
    const output = await extractor(missing, {
      pooling: "mean",
      normalize: true,
    });
    const vectors = output.tolist();
    output.dispose?.();
    missing.forEach((phrase, index) => {
      cache[normalizedKey(phrase)] = vectors[index];
    });
    await persistEmbeddingCache(cache);
  }

  return Object.fromEntries(
    phrases.map((phrase) => [
      normalizedKey(phrase),
      cache[normalizedKey(phrase)],
    ]),
  );
}

export async function filterRelatedBySemantics({
  seedKeywords,
  candidates,
  threshold = DEFAULT_SEMANTIC_THRESHOLD,
}) {
  const seeds = uniquePhrases(seedKeywords);
  const related = uniquePhrases(candidates);
  if (seeds.length === 0 || related.length === 0) {
    return {
      accepted: related,
      rejected: [],
      scores: {},
      status: "ready",
      error: null,
    };
  }

  try {
    const embeddings = await embedKeywords([...seeds, ...related]);
    const scores = scoreSemanticCandidates(
      seeds,
      related,
      embeddings,
    );
    const classified = classifySemanticCandidates(
      related,
      scores,
      threshold,
    );
    return {
      ...classified,
      scores,
      status: "ready",
      error: null,
    };
  } catch (error) {
    const fallback = classifyWithLexicalFallback(seeds, related);
    return {
      ...fallback,
      status: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
