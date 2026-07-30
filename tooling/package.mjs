import {
  chmod,
  mkdir,
  readdir,
  readFile,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const release = join(dist, "release");
const epoch = new Date("1980-01-01T00:00:00.000Z");

run(process.execPath, [join(root, "tooling", "build.mjs")], root);
await mkdir(release, { recursive: true });

const manifest = JSON.parse(
  await readFile(join(dist, "chrome-extension", "manifest.json"), "utf8"),
);
const artifacts = [];
artifacts.push(
  await zipDirectory(
    join(dist, "chrome-extension"),
    join(release, `indie-keyword-finder-${manifest.version}.zip`),
  ),
);

try {
  await stat(join(dist, "indie-keyword-finder-skill", "SKILL.md"));
  artifacts.push(
    await zipDirectory(
      join(dist, "indie-keyword-finder-skill"),
      join(release, `indie-keyword-finder-skill-${manifest.version}.zip`),
    ),
  );
} catch {
  // The Skill is added later in the implementation sequence.
}

const checksums = [];
for (const artifact of artifacts) {
  const digest = createHash("sha256")
    .update(await readFile(artifact))
    .digest("hex");
  checksums.push(`${digest}  ${artifact.split("/").at(-1)}`);
}
await writeFile(join(release, "SHA256SUMS"), `${checksums.join("\n")}\n`);
console.log(`Packaged ${artifacts.length} release artifact(s): ${release}`);

async function zipDirectory(directory, output) {
  const files = await listFiles(directory);
  for (const file of files) {
    await chmod(join(directory, file), 0o644);
    await utimes(join(directory, file), epoch, epoch);
  }
  run("zip", ["-X", "-q", output, ...files], directory);
  return output;
}

async function listFiles(directory, current = directory) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listFiles(directory, path)));
    } else {
      result.push(relative(directory, path));
    }
  }
  return result.sort();
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
