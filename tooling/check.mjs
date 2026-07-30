import { readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  join(root, "apps", "chrome-extension", "src"),
  join(root, "packages", "mining-core", "src"),
  join(root, "tooling"),
];
const files = [];

for (const directory of roots) {
  await collectJavaScript(directory, files);
}
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax checked ${files.length} JavaScript files.`);

const generated = spawnSync(
  process.execPath,
  [join(root, "tooling", "generate-skill-runner.mjs"), "--check"],
  { encoding: "utf8" },
);
if (generated.status !== 0) {
  process.stderr.write(generated.stderr);
  process.exit(generated.status ?? 1);
}
process.stdout.write(generated.stdout);

async function collectJavaScript(directory, output) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectJavaScript(path, output);
    } else if (extname(entry.name) === ".js" || extname(entry.name) === ".mjs") {
      output.push(path);
    }
  }
}
