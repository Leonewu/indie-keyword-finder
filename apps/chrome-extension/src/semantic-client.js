const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const INITIALIZATION_TIMEOUT_MS = 45_000;
const INFERENCE_TIMEOUT_MS = 120_000;

let offscreenCreationPromise = null;

async function hasOffscreenDocument() {
  const documentUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [documentUrl],
    });
    return contexts.length > 0;
  }
  const contexts = await clients.matchAll();
  return contexts.some(({ url }) => url === documentUrl);
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if (!offscreenCreationPromise) {
    offscreenCreationPromise = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["WORKERS", "LOCAL_STORAGE"],
        justification:
          "Load the packaged ONNX semantic model outside the extension service worker and cache keyword embeddings locally.",
      })
      .finally(() => {
        offscreenCreationPromise = null;
      });
  }
  await offscreenCreationPromise;
}

async function sendSemanticRequest(type, payload, timeoutMs) {
  await ensureOffscreenDocument();
  let timeoutId;
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({
        target: "semantic-offscreen",
        type,
        payload,
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `The local semantic model did not respond within ${Math.round(timeoutMs / 1_000)} seconds.`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
    if (!response?.ok) {
      throw new Error(response?.error || "The semantic runtime did not respond.");
    }
    return response.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function initializeSemanticEngine() {
  return sendSemanticRequest(
    "SEMANTIC_INITIALIZE",
    {},
    INITIALIZATION_TIMEOUT_MS,
  );
}

export function filterRelatedBySemantics(payload) {
  return sendSemanticRequest(
    "SEMANTIC_FILTER",
    payload,
    INFERENCE_TIMEOUT_MS,
  );
}

export function clearSemanticEmbeddingCache() {
  return sendSemanticRequest(
    "SEMANTIC_CLEAR_CACHE",
    {},
    INITIALIZATION_TIMEOUT_MS,
  );
}
