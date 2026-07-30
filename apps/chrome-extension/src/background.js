import {
  applyMiningObservation,
  buildTrendsUrl,
  comparisonTerms,
  createMiningSession,
  failMiningSession,
  publicMiningSession,
  restoreMiningSession,
  selectNextMiningBatch,
  setMiningStatus,
  stripGoogleJsonPrefix,
} from "./mining-core.js";
import { ensureDefaults } from "./storage.js";

const ANALYSIS_STORAGE_KEY = "analysisState";
const MIN_BATCH_DELAY_MS = 4_000;
const MAX_BATCH_DELAY_MS = 10_000;

let analysisPort = null;
let session = null;
let activeTrendsTabId = null;
let nextBatchTimer = null;
let batchTimeoutTimer = null;
let captured = freshCapture();

function freshCapture() {
  return {
    relatedByRequest: new Map(),
    timeline: null,
    processing: false,
  };
}

async function persistSession() {
  if (!session) {
    await chrome.storage.local.remove(ANALYSIS_STORAGE_KEY);
    return;
  }
  await chrome.storage.local.set({ [ANALYSIS_STORAGE_KEY]: session });
}

function send(message) {
  if (analysisPort) {
    try {
      analysisPort.postMessage(message);
      return;
    } catch (error) {
      console.warn("Unable to post through the Mining port", error);
    }
  }

  chrome.runtime.sendMessage(message).catch(() => {
    // The persisted session remains the source of truth when the panel is closed.
  });
}

function sendSnapshot(extra = {}) {
  send({
    type: "ANALYSIS_SNAPSHOT",
    analysis: publicMiningSession(session),
    ...extra,
  });
}

async function reportAnalysisError(error) {
  clearTimeout(batchTimeoutTimer);
  batchTimeoutTimer = null;
  const message = error instanceof Error ? error.message : String(error);
  session = failMiningSession(session, message);
  await persistSession();
  send({ type: "ANALYSIS_ERROR", error: message });
  sendSnapshot();
}

async function resolveTrendsTab(url) {
  if (activeTrendsTabId) {
    try {
      return await chrome.tabs.update(activeTrendsTabId, { url, active: true });
    } catch {
      activeTrendsTabId = null;
    }
  }

  return chrome.tabs.create({ url, active: true });
}

async function completeAnalysis() {
  clearTimeout(nextBatchTimer);
  clearTimeout(batchTimeoutTimer);
  nextBatchTimer = null;
  batchTimeoutTimer = null;
  if (!session) return;
  session = setMiningStatus(session, "complete");
  await persistSession();
  send({ type: "ANALYSIS_COMPLETE", analysis: publicMiningSession(session) });
  sendSnapshot();
}

async function runNextBatch() {
  if (!session) return;
  const selected = selectNextMiningBatch(session);
  session = selected.session;

  if (selected.complete) {
    await completeAnalysis();
    return;
  }
  if (selected.batch.length === 0) return;

  captured = freshCapture();
  const url = buildTrendsUrl(
    [...comparisonTerms(session.comparisonKeyword), ...selected.batch],
    { timeRange: session.timeRange, country: session.country },
  );
  const tab = await resolveTrendsTab(url);
  if (!tab?.id) throw new Error("Unable to open a Google Trends tab.");
  activeTrendsTabId = tab.id;
  clearTimeout(batchTimeoutTimer);
  batchTimeoutTimer = setTimeout(() => {
    reportAnalysisError(
      new Error(
        "Google Trends did not return all required data. Check the Trends tab and try again.",
      ),
    ).catch(console.error);
  }, 30_000);
  await persistSession();
  sendSnapshot();
}

function scheduleNextBatch() {
  if (!session || session.status !== "running") return;
  const delay = Math.round(
    MIN_BATCH_DELAY_MS +
      Math.random() * (MAX_BATCH_DELAY_MS - MIN_BATCH_DELAY_MS),
  );
  send({ type: "NEXT_BATCH_TIME", seconds: Math.ceil(delay / 1_000) });

  clearTimeout(nextBatchTimer);
  nextBatchTimer = setTimeout(() => {
    runNextBatch().catch(reportAnalysisError);
  }, delay);
}

async function processCapturedBatch() {
  if (!session || captured.processing || !session.batchInFlight) return;
  if (!captured.timeline) return;
  if (captured.relatedByRequest.size < session.currentBatch.length) return;

  captured.processing = true;
  clearTimeout(batchTimeoutTimer);
  batchTimeoutTimer = null;
  const observed = applyMiningObservation(session, {
    timelineData: captured.timeline,
    relatedPayloads: [...captured.relatedByRequest.values()],
  });
  session = observed.session;
  await persistSession();

  send({
    type: "ANALYSIS_UPDATE",
    addedRelated: observed.addedRelated,
    addedEffective: observed.addedEffective,
    analysis: publicMiningSession(session),
  });

  if (observed.complete) {
    send({ type: "ANALYSIS_COMPLETE", analysis: publicMiningSession(session) });
    sendSnapshot();
    return;
  }
  if (session.status === "paused") return;
  scheduleNextBatch();
}

async function startAnalysis(message) {
  clearTimeout(nextBatchTimer);
  clearTimeout(batchTimeoutTimer);
  nextBatchTimer = null;
  batchTimeoutTimer = null;
  session = createMiningSession({
    keywords: message.keywords,
    comparisonKeyword: message.comparisonKeyword,
    timeRange: message.timeRange,
    country: message.country,
    maxKeywords: message.maxKeywords,
    threshold: message.threshold,
  });
  activeTrendsTabId = null;
  captured = freshCapture();
  await persistSession();
  sendSnapshot();
  await runNextBatch();
}

async function pauseAnalysis() {
  clearTimeout(nextBatchTimer);
  nextBatchTimer = null;
  if (!session || !["running", "paused"].includes(session.status)) return;
  session = setMiningStatus(session, "paused");
  await persistSession();
  sendSnapshot();
}

async function resumeAnalysis() {
  if (!session || session.status !== "paused") return;
  session = setMiningStatus(session, "running");
  await persistSession();
  sendSnapshot();
  if (!session.batchInFlight) await runNextBatch();
}

async function stopAnalysis() {
  clearTimeout(nextBatchTimer);
  clearTimeout(batchTimeoutTimer);
  nextBatchTimer = null;
  batchTimeoutTimer = null;
  session = null;
  activeTrendsTabId = null;
  captured = freshCapture();
  await chrome.storage.local.remove(ANALYSIS_STORAGE_KEY);
  send({ type: "ANALYSIS_STOPPED" });
  sendSnapshot();
}

async function restoreAnalysis() {
  const result = await chrome.storage.local.get(ANALYSIS_STORAGE_KEY);
  session = restoreMiningSession(result[ANALYSIS_STORAGE_KEY]);
  if (session) await persistSession();
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  restoreAnalysis().catch(console.error);
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.windowId) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "analysis-connection") return;
  analysisPort = port;

  port.onMessage.addListener((message) => {
    const handle = async () => {
      switch (message.type) {
        case "START_ANALYSIS":
          await startAnalysis(message);
          break;
        case "PAUSE_ANALYSIS":
          await pauseAnalysis();
          break;
        case "RESUME_ANALYSIS":
          await resumeAnalysis();
          break;
        case "STOP_ANALYSIS":
          await stopAnalysis();
          break;
        case "GET_ANALYSIS_STATUS":
          sendSnapshot();
          break;
        case "PING":
          port.postMessage({ type: "PONG" });
          break;
        default:
          break;
      }
    };
    handle().catch(reportAnalysisError);
  });

  port.onDisconnect.addListener(() => {
    if (analysisPort === port) analysisPort = null;
  });
  sendSnapshot();
});

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== "BUILD_TRENDS_URL") return false;
  try {
    respond({
      ok: true,
      url: buildTrendsUrl(message.keywords, message.settings),
    });
  } catch (error) {
    respond({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return false;
});

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (
      !session ||
      !session.batchInFlight ||
      details.tabId !== activeTrendsTabId
    ) {
      return;
    }

    const url = new URL(details.url);
    const request = url.searchParams.get("req") ?? "";
    const isTimeline =
      url.pathname === "/trends/api/widgetdata/multiline" &&
      url.searchParams.has("req");
    const isCandidateRelated =
      url.pathname === "/trends/api/widgetdata/relatedsearches" &&
      request.includes('"keywordType":"QUERY"') &&
      !request.includes(
        `"value":"${session.comparisonKeyword.replaceAll('"', '\\"')}"`,
      );
    if (!isTimeline && !isCandidateRelated) return;

    try {
      const response = await fetch(details.url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Google Trends request failed (${response.status}).`);
      }
      const text = await response.text();
      if (text.trim() === "error") {
        throw new Error("Google Trends returned an error.");
      }
      const payload = stripGoogleJsonPrefix(text);
      if (isTimeline) {
        captured.timeline = payload?.default?.timelineData ?? null;
      } else {
        captured.relatedByRequest.set(request, payload);
      }
      await processCapturedBatch();
    } catch (error) {
      await reportAnalysisError(error);
    }
  },
  { urls: ["https://trends.google.com/trends/api/*"] },
  ["extraHeaders"],
);

restoreAnalysis().catch(console.error);
