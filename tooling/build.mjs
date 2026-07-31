import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materializeSemanticAssets } from "./semantic-assets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = join(root, "apps", "chrome-extension");
const extensionOutput = join(root, "dist", "chrome-extension");
const skillSource = join(
  root,
  ".agents",
  "skills",
  "indie-keyword-finder",
);
const skillOutput = join(root, "dist", "indie-keyword-finder-skill");

await rm(join(root, "dist"), { recursive: true, force: true });
await mkdir(extensionOutput, { recursive: true });

await cp(join(extensionSource, "icons"), join(extensionOutput, "icons"), {
  recursive: true,
});
await cp(join(extensionSource, "src"), extensionOutput, { recursive: true });
await cp(
  join(extensionSource, "manifest.json"),
  join(extensionOutput, "manifest.json"),
);
await cp(
  join(root, "packages", "mining-core", "src", "index.js"),
  join(extensionOutput, "mining-core.js"),
);
await cp(
  join(root, "packages", "semantic-core", "src", "index.js"),
  join(extensionOutput, "semantic-core.js"),
);
await materializeSemanticAssets(extensionOutput);

const manifest = JSON.parse(
  await readFile(join(extensionOutput, "manifest.json"), "utf8"),
);
await writeFile(
  join(extensionOutput, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

try {
  await cp(skillSource, skillOutput, { recursive: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`Built Chrome extension: ${extensionOutput}`);
if (await exists(skillOutput)) {
  console.log(`Built Companion Skill: ${skillOutput}`);
}

async function exists(path) {
  try {
    await readFile(join(path, "SKILL.md"), "utf8");
    return true;
  } catch {
    return false;
  }
}
