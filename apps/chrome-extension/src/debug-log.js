const DEBUG_LOG_KEY = "debugLogV1";
const MAX_DEBUG_LOG_ENTRIES = 500;

let writeQueue = Promise.resolve();

export function appendDebugLog(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    details: toSerializable(details),
  };
  writeQueue = writeQueue
    .then(async () => {
      const result = await chrome.storage.local.get(DEBUG_LOG_KEY);
      const entries = Array.isArray(result[DEBUG_LOG_KEY])
        ? result[DEBUG_LOG_KEY]
        : [];
      await chrome.storage.local.set({
        [DEBUG_LOG_KEY]: [...entries, entry].slice(-MAX_DEBUG_LOG_ENTRIES),
      });
    })
    .catch(() => {
      // Logging must never interrupt Mining.
    });
  return writeQueue;
}

export async function flushDebugLog() {
  await writeQueue;
}

export async function getDebugLog() {
  await flushDebugLog();
  const result = await chrome.storage.local.get(DEBUG_LOG_KEY);
  return Array.isArray(result[DEBUG_LOG_KEY]) ? result[DEBUG_LOG_KEY] : [];
}

export async function clearDebugLog() {
  await flushDebugLog();
  await chrome.storage.local.remove(DEBUG_LOG_KEY);
}

function toSerializable(value) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nested) => {
        if (nested instanceof Error) {
          return {
            name: nested.name,
            message: nested.message,
            stack: nested.stack,
          };
        }
        return nested;
      }),
    );
  } catch {
    return { value: String(value) };
  }
}
