import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const release = join(root, "dist", "release");
const version = JSON.parse(
  await readFile(join(root, "apps", "chrome-extension", "manifest.json"), "utf8"),
).version;
const extensionArtifact = `indie-keyword-finder-${version}.zip`;
const skillArtifact = `indie-keyword-finder-skill-${version}.zip`;

runPackage();
const first = await artifactDigests();
runPackage();
const second = await artifactDigests();

if (JSON.stringify(first) !== JSON.stringify(second)) {
  console.error("Release artifacts are not deterministic.");
  console.error({ first, second });
  process.exit(1);
}

const extensionEntries = zipEntries(
  join(release, extensionArtifact),
);
const allowedExtensionEntries = [
  "background.js",
  "content.js",
  "debug-log.js",
  "icons/icon.svg",
  "icons/icon128.png",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "manifest.json",
  "mining-core.js",
  "models/Xenova/all-MiniLM-L6-v2/config.json",
  "models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx",
  "models/Xenova/all-MiniLM-L6-v2/tokenizer.json",
  "models/Xenova/all-MiniLM-L6-v2/tokenizer_config.json",
  "offscreen.html",
  "offscreen.js",
  "semantic-core.js",
  "semantic-client.js",
  "semantic-engine.js",
  "sidebar.css",
  "sidebar.html",
  "sidebar.js",
  "storage.js",
  "third-party/Hugging-Face-Jinja-MIT.txt",
  "third-party/NOTICES.md",
  "third-party/ONNX-Runtime-MIT.txt",
  "third-party/Transformers.js-Apache-2.0.txt",
  "vendor/ort-wasm-simd-threaded.jsep.mjs",
  "vendor/ort-wasm-simd-threaded.jsep.wasm",
  "vendor/transformers.min.js",
].sort();
if (
  JSON.stringify(extensionEntries) !==
  JSON.stringify(allowedExtensionEntries)
) {
  console.error("Chrome ZIP does not match its release allow-list.");
  console.error(extensionEntries);
  process.exit(1);
}

const skillEntries = zipEntries(
  join(release, skillArtifact),
);
if (
  JSON.stringify(skillEntries) !==
  JSON.stringify(
    [
      "SKILL.md",
      "agents/openai.yaml",
      "references/mining-method.md",
      "scripts/mine.mjs",
    ].sort(),
  )
) {
  console.error("Companion Skill ZIP does not match its release allow-list.");
  console.error(skillEntries);
  process.exit(1);
}

console.log("Release artifacts are deterministic and allow-listed.");
for (const [name, digest] of Object.entries(second)) {
  console.log(`${digest}  ${name}`);
}

function runPackage() {
  const result = spawnSync(
    process.execPath,
    [join(root, "tooling", "package.mjs")],
    { cwd: root, encoding: "utf8", stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function artifactDigests() {
  const result = {};
  for (const name of [extensionArtifact, skillArtifact]) {
    result[name] = createHash("sha256")
      .update(await readFile(join(release, name)))
      .digest("hex");
  }
  return result;
}

function zipEntries(path) {
  const result = spawnSync("unzip", ["-Z1", path], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim().split("\n").filter(Boolean).sort();
}
