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
    rootsKeywords: ["Generator", "Converter", "Analyzer", "Tracker", "Builder"],
    autoRootKeywords: ["ai agents"],
    analysisState: {
      schemaVersion: 1,
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
      processed: 34,
      maxKeywords: 200,
      threshold: 20,
      timeRange: "Past 30 Days",
      country: "United States",
      comparisonKeyword: "weather",
      currentBatch: [],
      queued: 12,
      startedAt: Date.now() - 42_000,
      updatedAt: Date.now(),
    },
    settings: {
      activeLibrary: "custom",
      comparisonKeyword: "weather",
      country: "United States",
      maxKeywords: 20,
      maxTabs: 2,
      threshold: 20,
      timeRange: "Past 30 Days",
    },
  };
  const messageListeners = new Set();

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
            if (message.type === "GET_ANALYSIS_STATUS") {
              queueMicrotask(() => {
                for (const listener of portListeners) {
                  listener({
                    type: "ANALYSIS_SNAPSHOT",
                    analysis: data.analysisState ?? null,
                  });
                }
              });
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
