import {
  clearSemanticEmbeddingCache,
  filterRelatedBySemantics,
  initializeSemanticEngine,
} from "./semantic-engine.js";

async function initializeWithProgress() {
  let progressDelivery = Promise.resolve();
  const reportProgress = (progress) => {
    progressDelivery = progressDelivery
      .then(() =>
        chrome.runtime.sendMessage({
          target: "semantic-background",
          type: "SEMANTIC_ENGINE_PROGRESS",
          progress,
        }),
      )
      .catch(() => {
        // The next progress event will resynchronize after a service worker restart.
      });
  };
  const result = await initializeSemanticEngine({ onProgress: reportProgress });
  await progressDelivery;
  return result;
}

const operations = {
  SEMANTIC_INITIALIZE: () => initializeWithProgress(),
  SEMANTIC_FILTER: (payload) => filterRelatedBySemantics(payload),
  SEMANTIC_CLEAR_CACHE: () => clearSemanticEmbeddingCache(),
};

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (
    message?.target !== "semantic-offscreen" ||
    !(message.type in operations)
  ) {
    return false;
  }

  Promise.resolve()
    .then(() => operations[message.type](message.payload ?? {}))
    .then((result) => respond({ ok: true, result }))
    .catch((error) => {
      respond({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  return true;
});
