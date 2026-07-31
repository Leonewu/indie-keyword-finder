(() => {
  const data = {
    commonKeywords: [
      "zero trust dashboard",
      "ai image upscaler",
      "morning image maker",
    ],
    customKeywords: [
      "streetboard",
      "balloonaa",
      "halloween ghost",
      "sprunki",
      "ninja dog",
      "overtime io",
    ],
    historyKeywords: ["photo converter", "keyword radar"],
    language: "en",
    autoRootKeywords: ["ai agents"],
    analysisState: {
      schemaVersion: 3,
      status: "complete",
      rootKeywords: ["ai agents"],
      relatedKeywords: [
        "ai agent workflow",
        "browser automation ai",
        "local ai assistant",
        "agent memory patterns",
      ],
      effectiveKeywords: [
        "ai agent workflow",
        "browser automation ai",
        "local ai assistant",
        "agent memory patterns",
      ],
      semanticMode: "local",
      semanticStatus: "ready",
      semanticThreshold: 0.32,
      semanticRelevant: 4,
      semanticRejected: 9,
      semanticScores: {
        "ai agent workflow": 0.82,
        "browser automation ai": 0.71,
        "local ai assistant": 0.69,
        "agent memory patterns": 0.76,
      },
      batchesProcessed: 7,
      deepestProcessed: 2,
      processed: 34,
      maxDepth: 2,
      maxKeywords: 200,
      threshold: 20,
      timeRange: "Past 30 Days",
      country: "United States",
      comparisonKeyword: "empty",
      referenceKeyword: "ai agents",
      referenceMode: "seed",
      currentBatch: [],
      queued: 12,
      startedAt: Date.now() - 42_000,
      updatedAt: Date.now(),
    },
    settings: {
      activeLibrary: "custom",
      comparisonKeyword: "empty",
      country: "United States",
      maxDepth: 2,
      maxKeywords: 20,
      maxRelatedPerKeyword: 5,
      semanticThreshold: 0.32,
      maxTabs: 2,
      threshold: 20,
      timeRange: "Past 30 Days",
    },
    semanticEngineState: {
      id: "Xenova/all-MiniLM-L6-v2",
      name: "all-MiniLM-L6-v2",
      revision: "751bff37182d3f1213fa05d7196b954e230abad9",
      modelFile: "model_quantized.onnx",
      quantization: "Q8",
      dimensions: 384,
      runtime: "Transformers.js 3.7.6",
      executionProvider: "WASM",
      status: "ready",
      loaded: true,
      cacheEntries: 37,
      initializationMs: 842,
      error: null,
    },
  };
  const messageListeners = new Set();
  globalThis.__previewMessages = [];

  const local = {
    async get(keys) {
      if (keys == null) return { ...data };
      const selected = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (key in data) selected[key] = data[key];
      }
      return selected;
    },
    async set(values) {
      Object.assign(data, values);
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    async clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
  };

  globalThis.chrome = {
    storage: { local },
    tabs: {
      async create({ url }) {
        console.info("Preview would open:", url);
      },
    },
    runtime: {
      connect() {
        const portListeners = new Set();
        const disconnectListeners = new Set();
        const port = {
          onMessage: {
            addListener(listener) {
              portListeners.add(listener);
            },
          },
          onDisconnect: {
            addListener(listener) {
              disconnectListeners.add(listener);
            },
          },
          postMessage(message) {
            globalThis.__previewMessages.push(structuredClone(message));
            if (message.type === "GET_ANALYSIS_STATUS") {
              queueMicrotask(() => {
                for (const listener of portListeners) {
                  listener({
                    type: "ANALYSIS_SNAPSHOT",
                    analysis: data.analysisState ?? null,
                  });
                }
              });
              setTimeout(() => {
                for (const listener of portListeners) {
                  listener({
                    type: "SEMANTIC_ENGINE_STATUS",
                    semanticEngine: data.semanticEngineState,
                  });
                }
              }, 120);
            }
            if (message.type === "PING") {
              queueMicrotask(() => {
                for (const listener of portListeners) {
                  listener({ type: "PONG" });
                }
              });
            }
          },
          disconnect() {
            for (const listener of disconnectListeners) listener();
          },
        };
        return port;
      },
      onMessage: {
        addListener(listener) {
          messageListeners.add(listener);
        },
      },
    },
  };
})();
