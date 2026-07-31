import {
  COMPARISON_KEYWORDS,
  DATE_OPTIONS,
  DEFAULT_SETTINGS,
  GEO_OPTIONS,
  buildBatchTrendsUrls,
  buildTrendsUrl,
  comparisonTerms,
  normalizeKeywordInput,
  uniqueKeywords,
} from "./mining-core.js";
import {
  ensureDefaults,
  clearAllData,
  getKeywords,
  getLanguage,
  getLanguagePreference,
  getSettings,
  prependKeywords,
  removeKeyword,
  saveKeywords,
  saveLanguage,
  saveSettings,
} from "./storage.js";
import {
  clearDebugLog,
  getDebugLog,
} from "./debug-log.js";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const copy = {
  en: {
    batch: "Compare",
    mining: "Mining",
    settings: "Settings",
    addKeywords: "Add keywords to compare",
    addKeywordsHint: "One keyword per line",
    add: "Add",
    compareScope: "Comparison setup",
    country: "Country / region",
    time: "Time range",
    maxTabs: "Comparison tabs",
    comparison: "Reference keyword",
    comparisonHelp:
      "A relative anchor inside the same Google Trends request. It does not provide search volume.",
    keywordLimit: "Keyword limit",
    threshold: "Signal threshold",
    thresholdHelp:
      "A candidate must grow materially from its early baseline and reach this relative signal.",
    depth: "Depth",
    depthHelp:
      "How many related-query generations Mining may process after the seed.",
    seedKeyword: "Seed keyword",
    seedPlaceholder: "e.g. ai agents",
    discover: "Discover",
    productPromise: "Discover rising search opportunities from one seed.",
    productDetail:
      "Recursively explore related queries and surface relative signals worth validating.",
    referenceModel: "Signal model",
    advancedSettings: "Mining settings",
    ready: "Ready",
    relativeSignal: "Relative signal met",
    resultContext: "Worth validating in your SEO workflow",
    topicMatch: "{score}% topic match",
    signalMode: "Opportunity mode",
    signalModeEmerging: "Emerging · growth first",
    signalModeBalanced: "Balanced · demand + growth",
    signalModeDemand: "Demand · current strength",
    conclusionTitle: "Run conclusion",
    conclusionRunning: "Still exploring related queries…",
    conclusionQualified:
      "Found {count} opportunities that match the current relevance and trend rules.",
    conclusionNoTrend:
      "No new word met the current trend rule. {count} related queries were relevant, but none showed enough signal.",
    conclusionNoRelevant:
      "No related query passed the topic filter in this run.",
    conclusionNoCandidates:
      "No related queries were returned for this seed and time range.",
    relevantNotTrending: "Relevant, but not currently trending",
    reasonBelowSignal: "Below the relative signal threshold",
    reasonNoGrowth: "Insufficient recent growth",
    reasonInsufficientData: "Not enough time-series data",
    semanticReady: "On-device semantic filter",
    semanticAnalyzing: "Checking topic relevance on this device…",
    semanticFallback:
      "Semantic model unavailable · strict keyword fallback active",
    semanticRemoved: "{count} off-topic related queries removed",
    modelLoading: "Loading local semantic model…",
    modelLoadingButton: "Loading model…",
    modelUnavailable: "Local semantic model unavailable",
    modelUnavailableButton: "Model unavailable",
    modelReady: "Local semantic model ready",
    retryModel: "Retry model",
    modelBundled: "Bundled in the extension · no network download",
    modelPhasePreparing: "Preparing local runtime",
    modelPhaseReadingFiles: "Reading packaged model files",
    modelPhaseReadingModel: "Reading packaged ONNX model",
    modelPhaseInitializingRuntime: "Starting WASM runtime",
    modelPhaseReady: "Ready",
    modelErrorDetail: "Technical detail",
    semanticDiagnostics: "Semantic engine",
    model: "Model",
    modelRevision: "Revision",
    modelRuntime: "Runtime",
    modelExecution: "Execution",
    modelDimensions: "Dimensions",
    modelCache: "Cached keywords",
    modelLoadTime: "Initialization",
    debugLogs: "Mining debug log",
    debugLogsHelp:
      "Export the seed, each filter's before/after keywords, batches, and errors as JSON for diagnosis.",
    exportLogs: "Export logs",
    clearLogs: "Clear logs",
    logsExported: "Debug log exported",
    logsCleared: "Debug log cleared",
    noLogs: "No debug log entries yet.",
    queued: "Queued",
    clearData: "Clear all local data",
    clearDataHelp: "Remove saved keywords, settings, and Mining sessions from this browser.",
    confirmClearData: "Remove all Indie Keyword Finder data from this browser?",
    dataCleared: "Local data cleared",
    custom: "Keywords",
    favorites: "Favorites",
    history: "History",
    emptyLibrary: "Nothing here yet.",
    emptyMining: "Import a list or choose Edit to add seed keywords.",
    openTrends: "Compare in Google Trends",
    clear: "Clear",
    reset: "Reset position",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    importKeywords: "Import keywords",
    importFavorites: "Import favorites",
    start: "Start analysis",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    status: "Mining status",
    rootKeywords: "Root keywords",
    relatedKeywords: "Related keywords",
    newKeywords: "New words",
    results: "Qualified new words",
    nextBatch: "Next batch in {seconds}s · {processed} processed",
    miningProgress:
      "{processed}/{max} processed · {batches} batches · depth {depth}/{maxDepth}",
    language: "Language",
    languageAuto: "Automatic (browser language)",
    localOnly: "All lists and settings stay in Chrome local storage.",
    connectionReady: "Analyzer connected",
    connectionWaiting: "Connecting to analyzer…",
    copied: "Copied",
    added: "Added",
    saved: "Saved",
    deleted: "Deleted",
    imported: "Imported",
    opened: "Google Trends comparison tabs opened",
    noKeywords: "Add at least one keyword first.",
    comparisonRequired: "Choose a comparison keyword for mining.",
    analysisStarted: "Analysis started",
    analysisPaused: "Analysis paused",
    analysisResumed: "Analysis resumed",
    analysisStopped: "Analysis stopped",
    analysisComplete: "Analysis complete",
    noConnection: "The analyzer is not connected yet.",
    confirmClear: "Clear every keyword in this list?",
    searchGoogle: "Search Google",
    searchTwitter: "Search X / Twitter",
    searchReddit: "Search Reddit",
    difficulty: "Check keyword difficulty",
    compareTrends: "Open in Google Trends",
    favorite: "Add to favorites",
    delete: "Delete",
    copyKeyword: "Copy keyword",
    radarNote: "Rising-query research",
    miningNote:
      "Uses Google Trends related queries and time-series signals. Keep the Trends tab open while it runs.",
  },
  zh: {
    batch: "对比",
    mining: "新词挖掘",
    settings: "设置",
    addKeywords: "添加待对比关键词",
    addKeywordsHint: "每行输入一个关键词",
    add: "添加",
    compareScope: "对比范围",
    country: "国家 / 地区",
    time: "时间范围",
    maxTabs: "对比标签数",
    comparison: "对比基准词",
    comparisonHelp: "同一次 Google Trends 请求中的相对基准，不代表搜索量。",
    keywordLimit: "关键词上限",
    threshold: "有效词阈值",
    thresholdHelp: "候选词需从早期低位明显增长，并达到此相对信号阈值。",
    depth: "递归深度",
    depthHelp: "种子词之后最多继续处理多少代相关查询。",
    seedKeyword: "种子关键词",
    seedPlaceholder: "例如：ai agents",
    discover: "开始发现",
    productPromise: "从一个种子词，发现正在上升的搜索机会。",
    productDetail: "递归探索相关查询，用相对趋势信号筛出值得进一步验证的关键词。",
    referenceModel: "信号模型",
    advancedSettings: "挖掘设置",
    ready: "就绪",
    relativeSignal: "达到相对信号阈值",
    resultContext: "建议放入 SEO 工作流继续验证",
    topicMatch: "主题匹配度 {score}%",
    signalMode: "机会模式",
    signalModeEmerging: "上升机会 · 优先增长",
    signalModeBalanced: "综合模式 · 需求 + 增长",
    signalModeDemand: "需求模式 · 优先当前热度",
    conclusionTitle: "本次结论",
    conclusionRunning: "正在继续探索相关查询…",
    conclusionQualified:
      "发现 {count} 个同时满足当前语义和趋势规则的机会词。",
    conclusionNoTrend:
      "没有新词达到当前趋势规则。{count} 个相关查询语义上相关，但趋势信号还不够强。",
    conclusionNoRelevant: "本次没有相关查询通过主题过滤。",
    conclusionNoCandidates: "在当前种子词和时间范围内没有返回相关查询。",
    relevantNotTrending: "语义相关，但当前还没有明显上升",
    reasonBelowSignal: "低于相对信号阈值",
    reasonNoGrowth: "近期增长不足",
    reasonInsufficientData: "时间序列数据不足",
    semanticReady: "本地语义筛选",
    semanticAnalyzing: "正在本机判断主题相关性…",
    semanticFallback: "语义模型不可用 · 已启用严格关键词回退",
    semanticRemoved: "已过滤 {count} 个偏题相关查询",
    modelLoading: "正在加载本地语义模型…",
    modelLoadingButton: "加载模型中…",
    modelUnavailable: "本地语义模型不可用",
    modelUnavailableButton: "模型不可用",
    modelReady: "本地语义模型已就绪",
    retryModel: "重新加载模型",
    modelBundled: "模型已内置在扩展中 · 不会发起网络下载",
    modelPhasePreparing: "准备本地运行环境",
    modelPhaseReadingFiles: "读取扩展内模型文件",
    modelPhaseReadingModel: "读取扩展内 ONNX 模型",
    modelPhaseInitializingRuntime: "启动 WASM 运行环境",
    modelPhaseReady: "已就绪",
    modelErrorDetail: "技术详情",
    semanticDiagnostics: "语义引擎",
    model: "模型",
    modelRevision: "版本",
    modelRuntime: "运行库",
    modelExecution: "执行方式",
    modelDimensions: "向量维度",
    modelCache: "已缓存关键词",
    modelLoadTime: "初始化耗时",
    debugLogs: "挖掘诊断日志",
    debugLogsHelp: "导出种子词、每次过滤前后的关键词、批次和错误，保存为 JSON 供排查。",
    exportLogs: "导出日志",
    clearLogs: "清空日志",
    logsExported: "诊断日志已导出",
    logsCleared: "诊断日志已清空",
    noLogs: "还没有诊断日志。",
    queued: "待分析",
    clearData: "清除全部本地数据",
    clearDataHelp: "删除这个浏览器中的关键词、设置和挖掘记录。",
    confirmClearData: "确定删除这个浏览器中的全部 Indie Keyword Finder 数据吗？",
    dataCleared: "本地数据已清除",
    custom: "关键词",
    favorites: "收藏夹",
    history: "历史记录",
    emptyLibrary: "这里还没有关键词。",
    emptyMining: "请导入列表，或点击“编辑”添加种子关键词。",
    openTrends: "在 Google Trends 中对比",
    clear: "清空",
    reset: "重新开始",
    edit: "编辑",
    save: "保存",
    cancel: "取消",
    importKeywords: "导入关键词",
    importFavorites: "导入收藏夹",
    start: "开始分析",
    pause: "暂停",
    resume: "继续",
    stop: "停止",
    status: "新词挖掘情况",
    rootKeywords: "根词",
    relatedKeywords: "相关词",
    newKeywords: "有效新词",
    results: "有效新词列表",
    nextBatch: "下一批 {seconds} 秒后开始 · 已分析 {processed} 个",
    miningProgress:
      "已处理 {processed}/{max} · {batches} 批 · 深度 {depth}/{maxDepth}",
    language: "语言",
    languageAuto: "自动（跟随浏览器语言）",
    localOnly: "所有列表和设置仅保存在 Chrome 本地存储中。",
    connectionReady: "分析器已连接",
    connectionWaiting: "正在连接分析器…",
    copied: "已复制",
    added: "已添加",
    saved: "已保存",
    deleted: "已删除",
    imported: "导入成功",
    opened: "已打开 Google Trends 对比标签页",
    noKeywords: "请先添加至少一个关键词。",
    comparisonRequired: "新词挖掘需要选择一个对比关键词。",
    analysisStarted: "分析已开始",
    analysisPaused: "分析已暂停",
    analysisResumed: "分析已继续",
    analysisStopped: "分析已停止",
    analysisComplete: "分析完成",
    noConnection: "分析器尚未连接。",
    confirmClear: "确定清空这个列表中的全部关键词吗？",
    searchGoogle: "在 Google 搜索",
    searchTwitter: "在 X / Twitter 搜索",
    searchReddit: "在 Reddit 搜索",
    difficulty: "查看关键词难度",
    compareTrends: "在 Google Trends 中打开",
    favorite: "添加到收藏夹",
    delete: "删除",
    copyKeyword: "复制关键词",
    radarNote: "上升查询研究",
    miningNote:
      "分析 Google Trends 的相关搜索和时间序列信号。运行期间请保持 Trends 标签页打开。",
  },
};

const iconPaths = {
  batch: "M4 5h16M4 12h16M4 19h10",
  mining: "m4 16 4-4 3 3 7-8M14 7h4v4",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.5 7.5 0 0 0-.1-1l2-1.55-2-3.46-2.47 1a8 8 0 0 0-1.73-1L14.75 3h-4l-.38 2.99a8 8 0 0 0-1.73 1L6.17 6l-2 3.46 2 1.55a7.5 7.5 0 0 0 0 2L4.17 14.55l2 3.46 2.47-1a8 8 0 0 0 1.73 1l.38 2.99h4l.38-2.99a8 8 0 0 0 1.73-1l2.47 1 2-3.46-2-1.55c.05-.33.07-.67.07-1Z",
  chevron: "m7 10 5 5 5-5",
  edit: "m4 20 4.2-1 10.9-10.9-3.2-3.2L5 15.8 4 20Zm10.4-13.6 3.2 3.2",
  copy: "M8 8h11v12H8V8Zm-3 8H4V4h11v1",
  search: "m20 20-4.7-4.7M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z",
  twitter: "M18 6c-1 0-1.8.4-2.4 1.1A4 4 0 0 0 9 10.8 11.3 11.3 0 0 1 4 8.2c-.7 2 .2 3.5 1.5 4.3-.6 0-1.2-.2-1.7-.5 0 2 1.4 3.6 3.3 4-.6.2-1.2.2-1.8.1.5 1.6 2 2.8 3.8 2.8A8 8 0 0 1 4 20.5 11.2 11.2 0 0 0 21.2 11c0-.2 0-.3-.1-.5.8-.6 1.5-1.3 2-2.1-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1A4 4 0 0 0 18 6Z",
  reddit:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm8 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-7 4c1.5 1 4.5 1 6 0M14 8l1-3 3 .7",
  chart: "M5 19V9m5 10V5m5 14v-7m5 7V8",
  trends: "M4 17 9 12l3 3 7-8m-4 0h4v4",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  trash: "M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5",
  plus: "M12 5v14m-7-7h14",
  pause: "M9 5v14m6-14v14",
  play: "m8 5 11 7-11 7V5Z",
  stop: "M6 6h12v12H6z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2-2.4 3-5.4 3-9s-1-6.6-3-9m0 18c-2-2.4-3-5.4-3-9s1-6.6 3-9M3.5 9h17m-17 6h17",
};

const state = {
  view: "mining",
  language: "en",
  languagePreference: "auto",
  settings: null,
  libraries: {
    custom: [],
    common: [],
    history: [],
    autoRoot: [],
    lastUsed: [],
  },
  activeLibrary: "custom",
  cursors: { common: 0 },
  addExpanded: true,
  batchInput: "",
  miningInput: "",
  editing: null,
  editorDraft: "",
  comparisonEditing: null,
  connected: false,
  port: null,
  reconnectTimer: null,
  heartbeatTimer: null,
  analysis: null,
  semanticEngine: {
    status: "loading",
    loaded: false,
    cacheEntries: 0,
    progress: {
      phase: "preparing",
      percent: 0,
    },
  },
  nextSeconds: null,
  countdownTimer: null,
};

function t(key, replacements = {}) {
  let value = copy[state.language][key] ?? copy.en[key] ?? key;
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
}

function semanticProgressText(engine) {
  const phases = {
    preparing: "modelPhasePreparing",
    "reading-files": "modelPhaseReadingFiles",
    "reading-model": "modelPhaseReadingModel",
    "initializing-runtime": "modelPhaseInitializingRuntime",
    ready: "modelPhaseReady",
  };
  const progress = engine.progress ?? {};
  const phase = t(phases[progress.phase] ?? "modelPhasePreparing");
  const percent = Math.max(
    0,
    Math.min(100, Math.round(Number(progress.percent) || 0)),
  );
  const loaded = Number(progress.loadedBytes);
  const total = Number(progress.totalBytes);
  const bytes =
    loaded > 0 && total > 0
      ? ` · ${formatMegabytes(loaded)}/${formatMegabytes(total)}`
      : "";
  return `${phase} · ${percent}%${bytes}`;
}

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderModelProgress(engine) {
  const percent = Math.max(
    0,
    Math.min(100, Math.round(Number(engine.progress?.percent) || 0)),
  );
  const file = String(engine.progress?.file ?? "").split("/").at(-1);
  return `
    <div class="model-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
      <span style="width: ${percent}%"></span>
    </div>
    <small title="${escapeHtml(file)}">${escapeHtml(semanticProgressText(engine))}</small>
  `;
}

function conclusionForAnalysis(analysis) {
  const qualified = analysis.effectiveKeywords?.length ?? 0;
  const relevant = analysis.semanticRelevant ?? 0;
  if (["running", "paused"].includes(analysis.status)) {
    return { key: "conclusionRunning", replacements: {} };
  }
  if (qualified > 0) {
    return {
      key: "conclusionQualified",
      replacements: { count: qualified },
    };
  }
  if (relevant > 0) {
    return {
      key: "conclusionNoTrend",
      replacements: { count: relevant },
    };
  }
  return {
    key:
      (analysis.relatedKeywords?.length ?? 0) > 0
        ? "conclusionNoRelevant"
        : "conclusionNoCandidates",
    replacements: {},
  };
}

function qualificationReasonLabel(reason) {
  if (reason === "below-signal-threshold") return t("reasonBelowSignal");
  if (reason === "insufficient-data") return t("reasonInsufficientData");
  return t("reasonNoGrowth");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, className = "") {
  const fill = ["star", "play", "stop"].includes(name) ? "currentColor" : "none";
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[name]}"></path></svg>`;
}

function toast(message, tone = "success") {
  const element = document.createElement("div");
  element.className = `toast toast--${tone}`;
  element.textContent = message;
  toastRegion.appendChild(element);
  requestAnimationFrame(() => element.classList.add("toast--visible"));
  setTimeout(() => {
    element.classList.remove("toast--visible");
    setTimeout(() => element.remove(), 220);
  }, 2_200);
}

function controlSelect(name, label, options, value, scope) {
  const items = options
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`,
    )
    .join("");
  return `
    <label class="field">
      <span class="field__label">${escapeHtml(label)}</span>
      <select data-setting="${name}" data-scope="${scope}" class="control">${items}</select>
    </label>
  `;
}

function comparisonControl(scope) {
  const editing = state.comparisonEditing === scope;
  const knownComparisons = new Set(COMPARISON_KEYWORDS.map(([value]) => value));
  const comparisonOptions = knownComparisons.has(
    state.settings.comparisonKeyword,
  )
    ? COMPARISON_KEYWORDS
    : [
        [
          state.settings.comparisonKeyword,
          `${state.settings.comparisonKeyword} · custom`,
        ],
        ...COMPARISON_KEYWORDS,
      ];
  const options = comparisonOptions.map(
    ([value, label]) =>
      `<option value="${escapeHtml(value)}" ${value === state.settings.comparisonKeyword ? "selected" : ""}>${escapeHtml(label)}</option>`,
  ).join("");
  return `
    <label class="field">
      <span class="field__label field__label--with-help">${t("comparison")} <span class="help" title="${t("comparisonHelp")}">?</span></span>
      <span class="compound-control">
        ${
          editing
            ? `<input class="control" data-setting="comparisonKeyword" data-scope="${scope}" value="${escapeHtml(state.settings.comparisonKeyword === "empty" ? "" : state.settings.comparisonKeyword)}" placeholder="${t("comparison")}" />`
            : `<select class="control" data-setting="comparisonKeyword" data-scope="${scope}">${options}</select>`
        }
        <button class="icon-button" data-action="toggle-comparison" data-scope="${scope}" title="${t("edit")}" aria-label="${t("edit")}">${icon("edit")}</button>
      </span>
    </label>
  `;
}

function renderControls(scope, { maxTabs = false, mining = false } = {}) {
  const countries = Object.keys(GEO_OPTIONS).map((name) => [name, name]);
  const dates = Object.keys(DATE_OPTIONS).map((name) => [name, name]);
  return `
    <div class="control-grid ${mining ? "control-grid--mining" : ""}">
      ${controlSelect("country", t("country"), countries, state.settings.country, scope)}
      ${controlSelect("timeRange", t("time"), dates, state.settings.timeRange, scope)}
      ${
        maxTabs
          ? `<label class="field"><span class="field__label">${t("maxTabs")}</span><input class="control" data-setting="maxTabs" data-scope="${scope}" type="number" min="1" max="20" value="${state.settings.maxTabs}" /></label>`
          : ""
      }
      ${
        mining
          ? `<label class="field"><span class="field__label">${t("keywordLimit")}</span><input class="control" data-setting="maxKeywords" data-scope="${scope}" type="number" min="1" max="2000" value="${state.settings.maxKeywords ?? 200}" /></label>`
          : ""
      }
      ${comparisonControl(scope)}
      ${
        mining
          ? `<label class="field"><span class="field__label field__label--with-help">${t("threshold")} <span class="help" title="${t("thresholdHelp")}">?</span></span><input class="control" data-setting="threshold" data-scope="${scope}" type="number" min="1" max="10000" value="${state.settings.threshold ?? 20}" /></label>`
          : ""
      }
    </div>
  `;
}

function renderHeader() {
  const tabs = [
    ["mining", "mining"],
    ["batch", "batch"],
  ];
  return `
    <header class="app-header">
      <div class="brand">
        <span class="brand__mark"><i></i><i></i><i></i></span>
        <span><strong>Indie Keyword Finder</strong><small>${t("radarNote")}</small></span>
      </div>
      <nav class="primary-nav" aria-label="Primary">
        ${tabs
          .map(
            ([view, label]) =>
              `<button data-view="${view}" class="primary-nav__item ${state.view === view ? "is-active" : ""}">${icon(view)}<span>${t(label)}</span></button>`,
          )
          .join("")}
        <button data-view="settings" class="primary-nav__item primary-nav__item--settings ${state.view === "settings" ? "is-active" : ""}" title="${t("settings")}" aria-label="${t("settings")}">${icon("settings")}</button>
      </nav>
    </header>
  `;
}

function actionButton(action, title, iconName, source, index) {
  return `<button class="row-action" data-action="${action}" data-source="${source}" data-index="${index}" title="${title}" aria-label="${title}">${icon(iconName)}</button>`;
}

function renderKeywordRows(keywords, source, mode = "full") {
  if (keywords.length === 0) {
    return `<div class="empty-state"><span class="empty-state__radar"></span><p>${source === "autoRoot" ? t("emptyMining") : t("emptyLibrary")}</p></div>`;
  }

  return keywords
    .map((keyword, index) => {
      const used = state.libraries.lastUsed.includes(keyword);
      const controls =
        mode === "plain"
          ? ""
          : [
              actionButton("google", t("searchGoogle"), "search", source, index),
              actionButton(
                "twitter",
                t("searchTwitter"),
                "twitter",
                source,
                index,
              ),
              actionButton("reddit", t("searchReddit"), "reddit", source, index),
              mode === "full"
                ? actionButton(
                    "difficulty",
                    t("difficulty"),
                    "chart",
                    source,
                    index,
                  )
                : "",
              actionButton(
                "single-trends",
                t("compareTrends"),
                "trends",
                source,
                index,
              ),
              source === "common"
                ? actionButton("delete", t("delete"), "trash", source, index)
                : actionButton("favorite", t("favorite"), "star", source, index),
            ].join("");

      return `
        <article class="keyword-row ${used ? "is-used" : ""}">
          <button class="keyword-row__name" data-action="copy" data-source="${source}" data-index="${index}" title="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>
          <div class="keyword-row__actions">${controls}</div>
        </article>
      `;
    })
    .join("");
}

function renderBatch() {
  const keywords = state.libraries[state.activeLibrary] ?? [];
  return `
    <section class="workspace">
      <div class="section-card section-card--input">
        <button class="section-disclosure" data-action="toggle-add" aria-expanded="${state.addExpanded}">
          <span><b>01</b>${t("addKeywords")}</span>
          ${icon("chevron", state.addExpanded ? "is-rotated" : "")}
        </button>
        ${
          state.addExpanded
            ? `<div class="add-keywords"><textarea id="batch-input" placeholder="${t("addKeywordsHint")}">${escapeHtml(state.batchInput)}</textarea><button class="button button--secondary" data-action="add-keywords">${icon("plus")}${t("add")}</button></div>`
            : ""
        }
      </div>
      <section class="section-card">
        <div class="section-kicker"><b>02</b><span>${t("compareScope")}</span></div>
        ${renderControls("batch", { maxTabs: true })}
      </section>
      <section class="library-card">
        <div class="library-tabs" role="tablist">
          ${[
            ["custom", "custom"],
            ["common", "favorites"],
            ["history", "history"],
          ]
            .map(
              ([library, label]) =>
                `<button role="tab" data-library="${library}" class="${state.activeLibrary === library ? "is-active" : ""}">${t(label)}<span>${state.libraries[library].length}</span></button>`,
            )
            .join("")}
        </div>
        <div class="keyword-list">${renderKeywordRows(keywords, state.activeLibrary)}</div>
        <div class="library-tools">
          ${
            state.activeLibrary === "custom" && keywords.length > 0
              ? `<button class="text-button" data-action="clear-library">${t("clear")}</button>`
              : ""
          }
          ${
            state.activeLibrary === "common" && state.cursors.common > 0
              ? `<button class="text-button" data-action="reset-common">${t("reset")}</button>`
              : ""
          }
        </div>
      </section>
      <button class="button button--primary button--wide" data-action="open-batch">${icon("trends")}${t("openTrends")}</button>
    </section>
  `;
}

function renderEditor(source) {
  return `
    <div class="editor">
      <textarea id="editor-draft" placeholder="${t("addKeywordsHint")}">${escapeHtml(state.editorDraft)}</textarea>
      <div class="editor__actions">
        <button class="button button--quiet" data-action="cancel-editor">${t("cancel")}</button>
        <button class="button button--secondary" data-action="save-editor" data-source="${source}">${t("save")}</button>
      </div>
    </div>
  `;
}

function renderAnalysisStats() {
  const analysis = state.analysis;
  if (!analysis) {
    return `
      <section class="centered-results centered-results--empty">
        <span class="result-empty__line"></span>
        <p>${t("emptyMining")}</p>
      </section>
    `;
  }
  const status = analysis.status;
  const running = ["running", "paused"].includes(analysis.status);
  const semanticLabel =
    analysis.semanticStatus === "analyzing"
      ? t("semanticAnalyzing")
      : analysis.semanticStatus === "fallback"
        ? t("semanticFallback")
        : t("semanticReady");
  const semanticRemoved =
    analysis.semanticRejected > 0
      ? ` · ${t("semanticRemoved", {
          count: analysis.semanticRejected,
        })}`
      : "";
  const conclusion = conclusionForAnalysis(analysis);
  const diagnostics = Object.values(analysis.qualificationDiagnostics ?? {})
    .filter(
      (item) =>
        item?.keyword &&
        !item.qualified &&
        item.reason &&
        !(analysis.rootKeywords ?? []).some(
          (root) => root.toLocaleLowerCase() === item.keyword.toLocaleLowerCase(),
        ),
    )
    .slice(-5)
    .reverse();
  return `
    <section class="centered-results">
      <header class="results-summary">
        <div>
          <span>${t("results")}</span>
          <strong>${analysis.effectiveKeywords?.length ?? 0} ${t("newKeywords")}</strong>
        </div>
        <small>${t("miningProgress", {
          processed: analysis.processed ?? 0,
          max: analysis.maxKeywords ?? 0,
          batches: analysis.batchesProcessed ?? 0,
          depth:
            analysis.currentDepth ??
            analysis.deepestProcessed ??
            0,
          maxDepth: analysis.maxDepth ?? 0,
        })}</small>
      </header>
      ${
        analysis.semanticMode === "local"
          ? `<div class="semantic-status semantic-status--${analysis.semanticStatus ?? "waiting"}"><span></span><strong>${semanticLabel}</strong>${semanticRemoved}</div>`
          : ""
      }
      ${
        running && state.nextSeconds != null
          ? `<div class="analysis-timer"><span class="pulse"></span>${t("nextBatch", { seconds: state.nextSeconds, processed: analysis.processed ?? 0 })}</div>`
          : ""
      }
      <div class="analysis-conclusion">
        <span>${t("conclusionTitle")}</span>
        <p>${t(conclusion.key, conclusion.replacements)}</p>
      </div>
      <div class="stats-grid">
        <article><span>${t("rootKeywords")}</span><strong>${analysis.rootKeywords?.length ?? 0}</strong></article>
        <article><span>${t("relatedKeywords")}</span><strong>${analysis.relatedKeywords?.length ?? 0}</strong></article>
        <article><span>${t("newKeywords")}</span><strong>${analysis.effectiveKeywords?.length ?? 0}</strong></article>
      </div>
      ${
        analysis.effectiveKeywords?.length
          ? `<div class="results-heading"><span>${t("relativeSignal")}</span><span>
              <button class="row-action" data-action="copy-results" title="${t("copied")}">${icon("copy")}</button>
              <button class="row-action" data-action="add-results" data-destination="custom" title="${t("add")}">${icon("plus")}</button>
              <button class="row-action" data-action="add-results" data-destination="common" title="${t("favorite")}">${icon("star")}</button>
            </span></div>
            <div class="mining-result-list">${analysis.effectiveKeywords.map((keyword, index) => `
              <article class="mining-result">
                <span class="mining-result__index">${String(index + 1).padStart(2, "0")}</span>
                <button data-action="copy-result" data-keyword="${escapeHtml(keyword)}">
                  <strong>${escapeHtml(keyword)}</strong>
                  <small>${t("resultContext")}${
                    Number.isFinite(
                      Number(
                        analysis.semanticScores?.[
                          keyword.toLocaleLowerCase()
                        ],
                      ),
                    )
                      ? ` · ${t("topicMatch", {
                          score: Math.round(
                            Number(
                              analysis.semanticScores[
                                keyword.toLocaleLowerCase()
                              ],
                            ) * 100,
                          ),
                        })}`
                      : ""
                  }</small>
                </button>
                <span class="mining-result__signal">${t("relativeSignal")}</span>
                <button class="row-action" data-action="favorite-result" data-keyword="${escapeHtml(keyword)}" title="${t("favorite")}">${icon("star")}</button>
              </article>`).join("")}</div>`
          : `<div class="analysis-waiting"><span></span><p>${status === "complete" ? t("relevantNotTrending") : t("miningNote")}</p></div>`
      }
      ${
        !running && diagnostics.length > 0
          ? `<div class="analysis-near-misses"><header><span>${t("relevantNotTrending")}</span></header>${diagnostics
              .map(
                (item) =>
                  `<div class="analysis-near-miss"><strong>${escapeHtml(item.keyword)}</strong><small>${qualificationReasonLabel(item.reason)}</small></div>`,
              )
              .join("")}</div>`
          : ""
      }
    </section>
  `;
}

function renderMining() {
  const status = state.analysis?.status;
  const active = ["running", "paused"].includes(status);
  const modelReady =
    state.semanticEngine.status === "ready" &&
    state.semanticEngine.loaded === true;
  const modelStatusLabel =
    state.semanticEngine.status === "error"
      ? t("modelUnavailable")
      : modelReady
        ? t("modelReady")
        : t("modelLoading");
  const discoverLabel =
    state.semanticEngine.status === "error"
      ? t("modelUnavailableButton")
      : modelReady
        ? t("discover")
        : `${t("modelLoadingButton")} ${Math.round(Number(state.semanticEngine.progress?.percent) || 0)}%`;
  return `
    <section class="workspace workspace--scroll mining-workspace">
      <section class="centered-hero">
        <span class="prototype-kicker">Mining · ${state.connected ? modelStatusLabel : t("connectionWaiting")}</span>
        <h1>${t("productPromise")}</h1>
        <p>${t("productDetail")}</p>
        <div class="seed-composer">
          <label>
            <span>${t("seedKeyword")}</span>
            <input id="mining-seed" value="${escapeHtml(state.miningInput)}" placeholder="${t("seedPlaceholder")}" ${active ? "disabled" : ""} />
          </label>
          ${
            !active
              ? `<button class="button button--primary" data-action="start-analysis" ${modelReady && state.connected ? "" : "disabled"}>${discoverLabel}${modelReady ? icon("play") : ""}</button>`
              : `<button class="button button--secondary" data-action="${status === "paused" ? "resume-analysis" : "pause-analysis"}">${icon(status === "paused" ? "play" : "pause")}${t(status === "paused" ? "resume" : "pause")}</button>`
          }
        </div>
        <div class="model-readiness model-readiness--${state.semanticEngine.status}">
          <div class="model-readiness__status">
            <span class="model-readiness__dot"></span>
            <strong>${modelStatusLabel}</strong>
            ${
              state.semanticEngine.status === "error"
                ? `<button class="text-button" data-action="retry-semantic-engine">${t("retryModel")}</button>`
                : ""
            }
          </div>
          ${
            state.semanticEngine.status === "loading"
              ? `${renderModelProgress(state.semanticEngine)}<small>${t("modelBundled")}</small>`
              : ""
          }
          ${
            state.semanticEngine.status === "error" && state.semanticEngine.error
              ? `<small class="model-error"><strong>${t("modelErrorDetail")}:</strong> ${escapeHtml(state.semanticEngine.error)}</small>`
              : ""
          }
        </div>
        <div class="model-chips">
          <label><span>${t("country")}</span><select data-setting="country">${Object.keys(GEO_OPTIONS).map((name) => `<option value="${name}" ${name === state.settings.country ? "selected" : ""}>${name}</option>`).join("")}</select></label>
          <label><span>${t("time")}</span><select data-setting="timeRange">${Object.keys(DATE_OPTIONS).map((name) => `<option value="${name}" ${name === state.settings.timeRange ? "selected" : ""}>${name}</option>`).join("")}</select></label>
          <label><span>${t("threshold")}</span><input data-setting="threshold" type="number" min="1" max="10000" value="${state.settings.threshold ?? 20}" /></label>
          <label><span>${t("signalMode")}</span><select data-setting="signalMode">
            <option value="emerging" ${state.settings.signalMode === "emerging" ? "selected" : ""}>${t("signalModeEmerging")}</option>
            <option value="balanced" ${state.settings.signalMode === "balanced" ? "selected" : ""}>${t("signalModeBalanced")}</option>
            <option value="demand" ${state.settings.signalMode === "demand" ? "selected" : ""}>${t("signalModeDemand")}</option>
          </select></label>
          <label title="${t("depthHelp")}"><span>${t("depth")}</span><input data-setting="maxDepth" type="number" min="1" max="5" value="${state.settings.maxDepth ?? 2}" /></label>
        </div>
      </section>
      ${active ? `<div class="analysis-actions analysis-actions--compact"><button class="text-button text-button--danger" data-action="stop-analysis">${icon("stop")}${t("stop")}</button></div>` : ""}
      ${renderAnalysisStats()}
    </section>
  `;
}

function renderSettings() {
  const engine = state.semanticEngine;
  const engineStatus =
    engine.status === "error"
      ? t("modelUnavailable")
      : engine.status === "ready" && engine.loaded
        ? t("modelReady")
        : t("modelLoading");
  return `
    <section class="workspace settings-view">
      <div class="settings-hero">
        <span>${icon("settings")}</span>
        <h1>${t("settings")}</h1>
        <p>${t("localOnly")}</p>
      </div>
      <section class="section-card">
        <label class="field">
          <span class="field__label">${t("language")}</span>
          <select id="language-select" class="control">
            <option value="auto" ${state.languagePreference === "auto" ? "selected" : ""}>${t("languageAuto")}</option>
            <option value="en" ${state.language === "en" ? "selected" : ""}>English</option>
            <option value="zh" ${state.language === "zh" ? "selected" : ""}>中文</option>
          </select>
        </label>
      </section>
      <section class="section-card diagnostics-card">
        <header>
          <div>
            <strong>${t("semanticDiagnostics")}</strong>
            <p>${engineStatus}</p>
          </div>
          <span class="diagnostic-status diagnostic-status--${engine.status}"></span>
        </header>
        ${
          engine.status === "loading"
            ? `<div class="diagnostics-progress">${renderModelProgress(engine)}<small>${t("modelBundled")}</small></div>`
            : ""
        }
        ${
          engine.status === "error" && engine.error
            ? `<p class="diagnostics-error"><strong>${t("modelErrorDetail")}:</strong> ${escapeHtml(engine.error)}</p>`
            : ""
        }
        <dl>
          <div><dt>${t("model")}</dt><dd>${escapeHtml(engine.name ?? "—")} · ${escapeHtml(engine.quantization ?? "—")}</dd></div>
          <div><dt>${t("modelRevision")}</dt><dd title="${escapeHtml(engine.revision ?? "")}">${escapeHtml(engine.revision?.slice(0, 7) ?? "—")}</dd></div>
          <div><dt>${t("modelRuntime")}</dt><dd>${escapeHtml(engine.runtime ?? "—")}</dd></div>
          <div><dt>${t("modelExecution")}</dt><dd>${escapeHtml(engine.executionProvider ?? "—")}</dd></div>
          <div><dt>${t("modelDimensions")}</dt><dd>${engine.dimensions ?? "—"}</dd></div>
          <div><dt>${t("modelCache")}</dt><dd>${engine.cacheEntries ?? 0}</dd></div>
          <div><dt>${t("modelLoadTime")}</dt><dd>${Number.isFinite(Number(engine.initializationMs)) ? `${engine.initializationMs} ms` : "—"}</dd></div>
        </dl>
        ${
          engine.status === "error"
            ? `<button class="button button--secondary button--wide" data-action="retry-semantic-engine">${t("retryModel")}</button>`
            : ""
        }
      </section>
      <section class="section-card debug-log-card">
        <div>
          <strong>${t("debugLogs")}</strong>
          <p>${t("debugLogsHelp")}</p>
        </div>
        <div class="debug-log-actions">
          <button class="button button--secondary" data-action="export-debug-logs">${t("exportLogs")}</button>
          <button class="text-button" data-action="clear-debug-logs">${t("clearLogs")}</button>
        </div>
      </section>
      <section class="section-card danger-zone">
        <div>
          <strong>${t("clearData")}</strong>
          <p>${t("clearDataHelp")}</p>
        </div>
        <button class="button button--danger" data-action="clear-all-data">${t("clear")}</button>
      </section>
      <footer class="settings-footer">
        <span>Indie Keyword Finder</span>
        <b>v0.1.1</b>
      </footer>
    </section>
  `;
}

function render() {
  const content =
    state.view === "batch"
      ? renderBatch()
      : state.view === "mining"
        ? renderMining()
        : renderSettings();
  app.innerHTML = `${renderHeader()}<div class="app-body">${content}</div>`;
}

async function exportDebugLogs() {
  const entries = await getDebugLog();
  if (entries.length === 0) {
    toast(t("noLogs"), "error");
    return;
  }
  const payload = {
    product: "Indie Keyword Finder",
    exportedAt: new Date().toISOString(),
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `indie-keyword-finder-debug-${new Date()
    .toISOString()
    .replaceAll(/[:.]/g, "-")}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  toast(t("logsExported"));
}

function renderPreservingFocusedInput() {
  const active = document.activeElement;
  const id = active?.id;
  const selectionStart = active?.selectionStart;
  const selectionEnd = active?.selectionEnd;
  render();
  if (!id) return;
  const replacement = document.getElementById(id);
  if (!replacement || replacement.disabled) return;
  replacement.focus();
  if (
    Number.isFinite(selectionStart) &&
    Number.isFinite(selectionEnd) &&
    typeof replacement.setSelectionRange === "function"
  ) {
    replacement.setSelectionRange(selectionStart, selectionEnd);
  }
}

async function persistCursors() {
  await chrome.storage.local.set({ cursors: state.cursors });
}

async function openExternal(url) {
  await chrome.tabs.create({ url });
}

async function keywordAction(action, source, index) {
  const keyword = state.libraries[source]?.[index];
  if (!keyword) return;

  switch (action) {
    case "copy":
      await navigator.clipboard.writeText(keyword);
      toast(t("copied"));
      break;
    case "google":
      await openExternal(
        `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
      );
      break;
    case "twitter":
      await openExternal(
        `https://twitter.com/search?q=${encodeURIComponent(keyword)}`,
      );
      break;
    case "reddit":
      await openExternal(
        `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}`,
      );
      break;
    case "difficulty":
      await openExternal(
        `https://ahrefs.com/keyword-difficulty/?country=us&input=${encodeURIComponent(keyword)}`,
      );
      break;
    case "single-trends": {
      const terms = [
        ...comparisonTerms(state.settings.comparisonKeyword),
        keyword,
      ];
      await openExternal(buildTrendsUrl(terms, state.settings));
      break;
    }
    case "favorite":
      state.libraries.common = await prependKeywords("common", [keyword]);
      toast(t("added"));
      render();
      break;
    case "delete":
      state.libraries[source] = await removeKeyword(source, keyword);
      toast(t("deleted"));
      render();
      break;
    default:
      break;
  }
}

async function openBatch() {
  let keywords = [...state.libraries[state.activeLibrary]];
  const prior = [...state.libraries.lastUsed];

  if (
    prior.length > 0 &&
    ["custom", "common"].includes(state.activeLibrary)
  ) {
    state.libraries.history = await prependKeywords("history", prior);
    if (state.activeLibrary === "custom") {
      const priorSet = new Set(prior.map((item) => item.toLocaleLowerCase()));
      state.libraries.custom = await saveKeywords(
        "custom",
        state.libraries.custom.filter(
          (item) => !priorSet.has(item.toLocaleLowerCase()),
        ),
      );
      keywords = [...state.libraries.custom];
    } else {
      state.cursors.common += prior.length;
      await persistCursors();
      keywords = state.libraries.common.slice(state.cursors.common);
    }
  } else if (state.activeLibrary === "common") {
    keywords = state.libraries.common.slice(state.cursors.common);
  }

  if (keywords.length === 0) {
    if (state.activeLibrary === "common" && state.cursors.common > 0) {
      state.cursors.common = 0;
      state.libraries.lastUsed = await saveKeywords("lastUsed", []);
      await persistCursors();
      render();
    }
    toast(t("noKeywords"), "error");
    return;
  }

  const { urls, used } = buildBatchTrendsUrls(
    keywords,
    state.settings.comparisonKeyword,
    state.settings,
    state.settings.maxTabs,
  );
  state.libraries.lastUsed = await saveKeywords("lastUsed", used);
  await Promise.all(urls.map(openExternal));
  toast(t("opened"));
  render();
}

function setCountdown(seconds) {
  state.nextSeconds = Number(seconds);
  clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    if (state.nextSeconds == null || state.nextSeconds <= 0) {
      clearInterval(state.countdownTimer);
      return;
    }
    state.nextSeconds -= 1;
    if (state.view === "mining") render();
  }, 1_000);
  render();
}

function connectAnalyzer() {
  try {
    const port = chrome.runtime.connect({ name: "analysis-connection" });
    state.port = port;
    state.connected = true;
    render();

    port.onMessage.addListener((message) => {
      if (message.type === "PONG") {
        const wasConnected = state.connected;
        state.connected = true;
        if (!wasConnected) render();
        return;
      } else if (message.type === "ANALYSIS_SNAPSHOT") {
        state.analysis = message.analysis;
      } else if (message.type === "ANALYSIS_UPDATE") {
        state.analysis = message.analysis;
        state.nextSeconds = null;
      } else if (message.type === "NEXT_BATCH_TIME") {
        setCountdown(message.seconds);
        return;
      } else if (message.type === "ANALYSIS_COMPLETE") {
        state.analysis = message.analysis;
        state.nextSeconds = null;
        toast(t("analysisComplete"));
      } else if (message.type === "ANALYSIS_STOPPED") {
        state.analysis = null;
        state.nextSeconds = null;
        toast(t("analysisStopped"));
      } else if (message.type === "ANALYSIS_ERROR") {
        toast(message.error, "error");
      } else if (message.type === "SEMANTIC_ENGINE_STATUS") {
        state.semanticEngine = message.semanticEngine;
        renderPreservingFocusedInput();
        return;
      }
      render();
    });

    port.onDisconnect.addListener(() => {
      state.connected = false;
      state.port = null;
      state.semanticEngine = {
        ...state.semanticEngine,
        status: "loading",
        loaded: false,
      };
      clearInterval(state.heartbeatTimer);
      render();
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(connectAnalyzer, 1_000);
    });

    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = setInterval(() => {
      try {
        port.postMessage({ type: "PING" });
      } catch {
        state.connected = false;
      }
    }, 5_000);
    port.postMessage({ type: "GET_ANALYSIS_STATUS" });
  } catch {
    state.connected = false;
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connectAnalyzer, 1_000);
  }
}

async function handleClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    state.view = viewButton.dataset.view;
    state.editing = null;
    render();
    return;
  }

  const libraryTab = event.target.closest("[data-library]");
  if (libraryTab) {
    state.activeLibrary = libraryTab.dataset.library;
    state.settings = await saveSettings({
      activeLibrary: state.activeLibrary,
    });
    render();
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, source, scope, destination } = target.dataset;
  const index = Number(target.dataset.index);

  if (
    [
      "copy",
      "google",
      "twitter",
      "reddit",
      "difficulty",
      "single-trends",
      "favorite",
      "delete",
    ].includes(action)
  ) {
    await keywordAction(action, source, index);
    return;
  }

  switch (action) {
    case "toggle-add":
      state.addExpanded = !state.addExpanded;
      render();
      break;
    case "add-keywords": {
      const keywords = normalizeKeywordInput(state.batchInput);
      if (keywords.length === 0) {
        toast(t("noKeywords"), "error");
        return;
      }
      state.libraries.custom = await prependKeywords("custom", keywords);
      state.batchInput = "";
      state.activeLibrary = "custom";
      toast(t("added"));
      render();
      break;
    }
    case "toggle-comparison":
      state.comparisonEditing =
        state.comparisonEditing === scope ? null : scope;
      render();
      break;
    case "clear-library":
      if (!confirm(t("confirmClear"))) return;
      state.libraries.custom = await saveKeywords("custom", []);
      render();
      break;
    case "reset-common":
      state.cursors.common = 0;
      state.libraries.lastUsed = await saveKeywords("lastUsed", []);
      await persistCursors();
      render();
      break;
    case "open-batch":
      await openBatch();
      break;
    case "edit-library":
      state.editing = source;
      state.editorDraft = state.libraries[source].join("\n");
      render();
      break;
    case "cancel-editor":
      state.editing = null;
      state.editorDraft = "";
      render();
      break;
    case "save-editor": {
      const keywords = normalizeKeywordInput(state.editorDraft);
      state.libraries[source] = await saveKeywords(source, keywords);
      state.editing = null;
      state.editorDraft = "";
      toast(t("saved"));
      render();
      break;
    }
    case "import": {
      state.libraries.autoRoot = await saveKeywords(
        "autoRoot",
        uniqueKeywords([
          ...state.libraries.autoRoot,
          ...state.libraries[source],
        ]),
      );
      toast(t("imported"));
      render();
      break;
    }
    case "start-analysis":
      if (
        state.semanticEngine.status !== "ready" ||
        !state.semanticEngine.loaded
      ) {
        toast(
          state.semanticEngine.status === "error"
            ? t("modelUnavailable")
            : t("modelLoading"),
          "error",
        );
        return;
      }
      if (!state.connected || !state.port) {
        toast(t("noConnection"), "error");
        return;
      }
      {
        const seeds = normalizeKeywordInput(state.miningInput);
        if (seeds.length === 0) {
          toast(t("noKeywords"), "error");
          return;
        }
        state.libraries.autoRoot = await saveKeywords("autoRoot", seeds);
      }
      if (state.libraries.autoRoot.length === 0) {
        toast(t("noKeywords"), "error");
        return;
      }
      state.port.postMessage({
        type: "START_ANALYSIS",
        keywords: state.libraries.autoRoot,
        comparisonKeyword: "empty",
        timeRange: state.settings.timeRange,
        country: state.settings.country,
        maxDepth: state.settings.maxDepth ?? 2,
        maxKeywords: state.settings.maxKeywords ?? 200,
        maxRelatedPerKeyword:
          state.settings.maxRelatedPerKeyword ?? 5,
        semanticThreshold:
          state.settings.semanticThreshold ??
          DEFAULT_SETTINGS.semanticThreshold,
        threshold: state.settings.threshold ?? 20,
        signalMode: state.settings.signalMode ?? DEFAULT_SETTINGS.signalMode,
      });
      toast(t("analysisStarted"));
      break;
    case "retry-semantic-engine":
      state.semanticEngine = {
        ...state.semanticEngine,
        status: "loading",
        loaded: false,
        progress: {
          phase: "preparing",
          percent: 0,
        },
        error: null,
      };
      state.port?.postMessage({ type: "RETRY_SEMANTIC_ENGINE" });
      render();
      break;
    case "copy-result":
      await navigator.clipboard.writeText(target.dataset.keyword ?? "");
      toast(t("copied"));
      break;
    case "favorite-result":
      state.libraries.common = await prependKeywords(
        "common",
        [target.dataset.keyword ?? ""],
      );
      toast(t("added"));
      break;
    case "clear-all-data":
      if (!confirm(t("confirmClearData"))) return;
      state.port?.postMessage({ type: "STOP_ANALYSIS" });
      await clearAllData();
      state.analysis = null;
      state.libraries = {
        custom: [],
        common: [],
        history: [],
        autoRoot: [],
        lastUsed: [],
      };
      state.miningInput = "";
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...(await getSettings()),
      };
      state.port?.postMessage({ type: "CLEAR_SEMANTIC_CACHE" });
      toast(t("dataCleared"));
      render();
      break;
    case "export-debug-logs":
      await exportDebugLogs();
      break;
    case "clear-debug-logs":
      await clearDebugLog();
      toast(t("logsCleared"));
      break;
    case "pause-analysis":
      state.port?.postMessage({ type: "PAUSE_ANALYSIS" });
      toast(t("analysisPaused"));
      break;
    case "resume-analysis":
      state.port?.postMessage({ type: "RESUME_ANALYSIS" });
      toast(t("analysisResumed"));
      break;
    case "stop-analysis":
      state.port?.postMessage({ type: "STOP_ANALYSIS" });
      break;
    case "copy-results":
      await navigator.clipboard.writeText(
        state.analysis?.effectiveKeywords?.join("\n") ?? "",
      );
      toast(t("copied"));
      break;
    case "add-results":
      state.libraries[destination] = await prependKeywords(
        destination,
        state.analysis?.effectiveKeywords ?? [],
      );
      toast(t("added"));
      render();
      break;
    default:
      break;
  }
}

async function handleInput(event) {
  if (event.target.id === "mining-seed") {
    state.miningInput = event.target.value;
    return;
  }
  if (event.target.id === "batch-input") {
    state.batchInput = event.target.value;
    return;
  }
  if (event.target.id === "editor-draft") {
    state.editorDraft = event.target.value;
    return;
  }
  const setting = event.target.dataset.setting;
  if (!setting) return;
  let value = event.target.value;
  if (
    ["maxTabs", "maxDepth", "maxKeywords", "threshold"].includes(
      setting,
    )
  ) {
    value = Math.max(1, Number(value) || 1);
  }
  state.settings = await saveSettings({ [setting]: value });
}

async function handleChange(event) {
  if (event.target.id === "language-select") {
    state.languagePreference = ["auto", "en", "zh"].includes(event.target.value)
      ? event.target.value
      : "auto";
    state.language =
      state.languagePreference === "auto"
        ? await getLanguage()
        : state.languagePreference;
    await saveLanguage(state.languagePreference);
    render();
    return;
  }
  const setting = event.target.dataset.setting;
  if (setting) {
    state.settings = await saveSettings({ [setting]: event.target.value });
    render();
  }
}

async function initialize() {
  await ensureDefaults();
  const [
    settings,
    languagePreference,
    language,
    custom,
    common,
    history,
    autoRoot,
    lastUsed,
    localState,
  ] = await Promise.all([
    getSettings(),
    getLanguagePreference(),
    getLanguage(),
    getKeywords("custom"),
    getKeywords("common"),
    getKeywords("history"),
    getKeywords("autoRoot"),
    getKeywords("lastUsed"),
    chrome.storage.local.get(["cursors", "analysisState"]),
  ]);

  state.settings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
  state.language = language;
  state.languagePreference = languagePreference;
  state.activeLibrary = settings.activeLibrary ?? "custom";
  state.libraries = {
    custom,
    common,
    history,
    autoRoot,
    lastUsed,
  };
  state.miningInput = autoRoot[0] ?? "";
  state.cursors = {
    common: Number(localState.cursors?.common) || 0,
  };
  state.analysis = localState.analysisState ?? null;
  render();
  connectAnalyzer();

  chrome.runtime.onMessage.addListener((message) => {
    if (
      message.type === "ADD_KEYWORD" &&
      message.library === "common" &&
      message.keyword
    ) {
      prependKeywords("common", [message.keyword]).then((keywords) => {
        state.libraries.common = keywords;
        if (state.view === "batch") render();
        toast(t("added"));
      });
    }
  });
}

app.addEventListener("click", (event) => {
  handleClick(event).catch((error) => {
    console.error(error);
    toast(error.message, "error");
  });
});
app.addEventListener("input", (event) => {
  handleInput(event).catch(console.error);
});
app.addEventListener("change", (event) => {
  handleChange(event).catch(console.error);
});

initialize().catch((error) => {
  console.error(error);
  app.innerHTML = `<div class="fatal-error"><b>Indie Keyword Finder failed to start.</b><span>${escapeHtml(error.message)}</span></div>`;
});
