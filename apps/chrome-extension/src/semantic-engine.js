import { env, pipeline } from "./vendor/transformers.min.js";
import {
  classifySemanticCandidates,
  classifyWithLexicalFallback,
  DEFAULT_SEMANTIC_THRESHOLD,
  SEMANTIC_MODEL_INFO,
  scoreSemanticCandidates,
} from "./semantic-core.js";

const EMBEDDING_CACHE_KEY = "semanticEmbeddingCacheV1";
const MAX_CACHED_EMBEDDINGS = 300;
const MISSING_CONTENT_LENGTH_WARNING =
  "Unable to determine content-length from response headers. Will expand buffer when needed.";

let extractorPromise = null;
let extractorReady = false;
let embeddingCachePromise = null;
const progressListeners = new Set();

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
    embeddingCachePromise = Promise.resolve()
      .then(() => {
        const serialized = localStorage.getItem(EMBEDDING_CACHE_KEY);
        const saved = serialized ? JSON.parse(serialized) : {};
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
  try {
    localStorage.setItem(EMBEDDING_CACHE_KEY, JSON.stringify(bounded));
  } catch {
    // In-memory embeddings remain available if local storage is full.
  }
}

function emitProgress(update) {
  for (const listener of progressListeners) listener(update);
}

async function getExtractorWithKnownWarningFiltered() {
  const originalWarn = console.warn;
  let reported = false;
  console.warn = (...args) => {
    if (args[0] === MISSING_CONTENT_LENGTH_WARNING) {
      if (!reported) {
        reported = true;
        console.info(
          "[Indie Keyword Finder] Local extension assets omit Content-Length; Transformers.js is expanding the read buffer safely.",
        );
      }
      return;
    }
    originalWarn(...args);
  };
  try {
    return await getExtractor();
  } finally {
    console.warn = originalWarn;
  }
}

function normalizePipelineProgress(event) {
  const file = String(event?.file ?? "");
  const sourcePercent = Number(event?.progress);
  const isModel = file.endsWith(".onnx");

  if (event?.status === "progress" && Number.isFinite(sourcePercent)) {
    return {
      phase: isModel ? "reading-model" : "reading-files",
      percent: Math.round(
        isModel
          ? 5 + Math.max(0, Math.min(100, sourcePercent)) * 0.85
          : Math.max(1, Math.min(5, sourcePercent * 0.05)),
      ),
      file,
      loadedBytes: Number(event.loaded) || null,
      totalBytes: Number(event.total) || null,
    };
  }
  if (event?.status === "done" && isModel) {
    return {
      phase: "initializing-runtime",
      percent: 90,
      file,
      loadedBytes: Number(event.loaded) || null,
      totalBytes: Number(event.total) || null,
    };
  }
  if (event?.status === "initiate" || event?.status === "download") {
    return {
      phase: isModel ? "reading-model" : "reading-files",
      percent: isModel ? 5 : 1,
      file,
      loadedBytes: null,
      totalBytes: null,
    };
  }
  return null;
}

async function createExtractor() {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false;
  env.localModelPath = chrome.runtime.getURL("models/");
  env.backends.onnx.wasm.wasmPaths =
    chrome.runtime.getURL("vendor/");
  env.backends.onnx.wasm.numThreads = 1;

  return pipeline("feature-extraction", SEMANTIC_MODEL_INFO.id, {
    device: "wasm",
    dtype: "q8",
    local_files_only: true,
    progress_callback(event) {
      const update = normalizePipelineProgress(event);
      if (update) emitProgress(update);
    },
  });
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = createExtractor()
      .then((extractor) => {
        extractorReady = true;
        return extractor;
      })
      .catch((error) => {
        extractorPromise = null;
        extractorReady = false;
        throw error;
      });
  }
  return extractorPromise;
}

export async function initializeSemanticEngine({ onProgress } = {}) {
  const startedAt = performance.now();
  if (onProgress) progressListeners.add(onProgress);
  onProgress?.({
    phase: "preparing",
    percent: 0,
    file: null,
    loadedBytes: null,
    totalBytes: null,
  });
  try {
    await getExtractorWithKnownWarningFiltered();
    onProgress?.({
      phase: "initializing-runtime",
      percent: 95,
      file: null,
      loadedBytes: null,
      totalBytes: null,
    });
    const cache = await loadEmbeddingCache();
    onProgress?.({
      phase: "ready",
      percent: 100,
      file: null,
      loadedBytes: null,
      totalBytes: null,
    });
    return {
      ...SEMANTIC_MODEL_INFO,
      status: "ready",
      loaded: extractorReady,
      cacheEntries: Object.keys(cache).length,
      initializationMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}

export async function getSemanticEngineDiagnostics() {
  const cache = await loadEmbeddingCache();
  return {
    ...SEMANTIC_MODEL_INFO,
    status: extractorReady ? "ready" : "loading",
    loaded: extractorReady,
    cacheEntries: Object.keys(cache).length,
  };
}

export async function clearSemanticEmbeddingCache() {
  embeddingCachePromise = Promise.resolve({});
  localStorage.removeItem(EMBEDDING_CACHE_KEY);
  return {
    ...SEMANTIC_MODEL_INFO,
    status: extractorReady ? "ready" : "loading",
    loaded: extractorReady,
    cacheEntries: 0,
  };
}

async function embedKeywords(keywords) {
  const phrases = uniquePhrases(keywords);
  const cache = await loadEmbeddingCache();
  const missing = phrases.filter(
    (phrase) => !cache[normalizedKey(phrase)],
  );

  if (missing.length > 0) {
    const extractor = await getExtractorWithKnownWarningFiltered();
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
  parentKeywords = [],
  candidates,
  threshold = DEFAULT_SEMANTIC_THRESHOLD,
}) {
  const seeds = uniquePhrases(seedKeywords);
  const parents = uniquePhrases(parentKeywords);
  const related = uniquePhrases(candidates);
  if (seeds.length === 0 || related.length === 0) {
    const diagnostics = await getSemanticEngineDiagnostics();
    return {
      accepted: related,
      rejected: [],
      scores: {},
      status: diagnostics.status,
      error: null,
      cacheEntries: diagnostics.cacheEntries,
    };
  }

  try {
    const embeddings = await embedKeywords([...seeds, ...parents, ...related]);
    const scores = scoreSemanticCandidates(
      [...seeds, ...parents],
      related,
      embeddings,
    );
    const classified = classifySemanticCandidates(
      related,
      scores,
      threshold,
      {
        seedKeywords: seeds,
        parentKeywords: parents,
      },
    );
    return {
      ...classified,
      scores,
      status: "ready",
      error: null,
      cacheEntries: Object.keys(await loadEmbeddingCache()).length,
    };
  } catch (error) {
    const fallback = classifyWithLexicalFallback(
      [...seeds, ...parents],
      related,
    );
    return {
      ...fallback,
      reasons: Object.fromEntries(
        related.map((candidate) => [
          String(candidate).trim().toLocaleLowerCase(),
          fallback.accepted.includes(candidate)
            ? "accepted-lexical-fallback"
            : "missing-topic-anchor",
        ]),
      ),
      status: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
