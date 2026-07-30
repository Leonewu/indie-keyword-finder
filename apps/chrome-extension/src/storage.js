import {
  DEFAULT_ROOT_KEYWORDS,
  DEFAULT_SETTINGS,
  uniqueKeywords,
} from "./mining-core.js";

const keywordKey = (type) => `${type}Keywords`;

export async function getKeywords(type) {
  const key = keywordKey(type);
  const result = await chrome.storage.local.get(key);
  return Array.isArray(result[key]) ? result[key] : [];
}

export async function saveKeywords(type, keywords) {
  const cleaned = uniqueKeywords(keywords);
  await chrome.storage.local.set({ [keywordKey(type)]: cleaned });
  return cleaned;
}

export async function prependKeywords(type, keywords) {
  const current = await getKeywords(type);
  const combined = uniqueKeywords([...keywords, ...current]);
  const limited = type === "history" ? combined.slice(0, 100) : combined;
  await saveKeywords(type, limited);
  return limited;
}

export async function removeKeyword(type, keyword) {
  const current = await getKeywords(type);
  const target = String(keyword).toLocaleLowerCase();
  return saveKeywords(
    type,
    current.filter((item) => item.toLocaleLowerCase() !== target),
  );
}

export async function getSettings() {
  const result = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) };
}

export async function saveSettings(patch) {
  const settings = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings });
  return settings;
}

export async function getLanguage() {
  const result = await chrome.storage.local.get("language");
  return result.language === "zh" ? "zh" : "en";
}

export async function saveLanguage(language) {
  await chrome.storage.local.set({ language: language === "zh" ? "zh" : "en" });
}

export async function ensureDefaults() {
  const result = await chrome.storage.local.get([
    keywordKey("roots"),
    keywordKey("common"),
  ]);
  const changes = {};

  if (!Array.isArray(result[keywordKey("roots")])) {
    changes[keywordKey("roots")] = [...DEFAULT_ROOT_KEYWORDS];
  }
  if (!Array.isArray(result[keywordKey("common")])) {
    changes[keywordKey("common")] = [];
  }
  if (Object.keys(changes).length > 0) {
    await chrome.storage.local.set(changes);
  }
}

export async function clearAllData() {
  await chrome.storage.local.clear();
  await ensureDefaults();
}
