import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", root), "utf8"),
);

test("uses Manifest V3 and a module service worker", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.background.service_worker, "background.js");
});

test("allows only packaged JavaScript and local WebAssembly execution", () => {
  assert.equal(
    manifest.content_security_policy.extension_pages,
    "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  );
});

test("limits host access to Google Trends", () => {
  assert.deepEqual(manifest.host_permissions, [
    "https://trends.google.com/*",
  ]);
});

test("requests only the permissions used by the public release", () => {
  assert.deepEqual(manifest.permissions, [
    "offscreen",
    "sidePanel",
    "storage",
    "webRequest",
  ]);
});

test("uses the approved public identity", () => {
  assert.equal(
    manifest.name,
    "Indie Keyword Finder – Google Trends Keywords",
  );
  assert.equal(manifest.short_name, "Indie Keyword Finder");
});

test("all manifest entry files exist", async () => {
  const paths = [
    `src/${manifest.background.service_worker}`,
    `src/${manifest.side_panel.default_path}`,
    "src/offscreen.html",
    "src/offscreen.js",
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    ...Object.values(manifest.icons),
  ];
  await Promise.all(
    paths.map((path) => {
      const normalized = path.startsWith("icons/") ? path : path.startsWith("src/") ? path : `src/${path}`;
      return access(new URL(normalized, root));
    }),
  );
});

test("production-facing text contains no legacy product identity", async () => {
  const files = [
    "manifest.json",
    "src/background.js",
    "src/content.js",
    "src/sidebar.html",
    "src/sidebar.js",
    "src/sidebar.css",
    "src/storage.js",
  ];
  const forbiddenLegacyName = ["Trends", "Radar"].join(" ");
  const contents = await Promise.all(
    files.map((path) => readFile(new URL(path, root), "utf8")),
  );
  for (const content of contents) {
    assert.equal(content.includes(forbiddenLegacyName), false);
    assert.doesNotMatch(content, /Authorized Clone/i);
  }
});
