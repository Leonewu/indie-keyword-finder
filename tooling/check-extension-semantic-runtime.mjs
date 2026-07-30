import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = await realpath(
  join(root, "dist", "chrome-extension"),
);
const extensionId = extensionIdFromPath(extensionPath);
const chromium = await findChromium();
const profile = await mkdtemp(
  join(tmpdir(), "indie-keyword-finder-extension-"),
);
const child = spawn(
  chromium,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-sandbox",
    "--remote-debugging-pipe",
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"] },
);

let browserErrors = "";
child.stderr.on("data", (chunk) => {
  browserErrors += chunk.toString("utf8");
});

try {
  const cdp = connectCdpPipe(child);
  const { targetId } = await cdp.send("Target.createTarget", {
    url: `chrome-extension://${extensionId}/sidebar.html`,
  });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    flatten: true,
    targetId,
  });
  await cdp.send("Runtime.enable", {}, sessionId);

  const snapshots = [];
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const snapshot = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const button = document.querySelector('[data-action="start-analysis"]');
        const readiness = document.querySelector(".model-readiness");
        return {
          buttonDisabled: button?.disabled ?? true,
          buttonText: button?.textContent?.trim() ?? "",
          readinessText: readiness?.textContent?.trim() ?? "",
          readinessClass: readiness?.className ?? "",
          progress: Number(
            readiness?.querySelector('[role="progressbar"]')
              ?.getAttribute("aria-valuenow") ?? 0,
          ),
        };
      })()`,
    );
    const serialized = JSON.stringify(snapshot);
    if (serialized !== JSON.stringify(snapshots.at(-1))) {
      snapshots.push(snapshot);
    }

    if (
      snapshot.readinessClass.includes("model-readiness--ready") &&
      snapshot.buttonDisabled === false
    ) {
      const sawMeasuredLoading = snapshots.some(
        ({ buttonDisabled, progress, readinessClass }) =>
          buttonDisabled &&
          progress > 0 &&
          progress < 100 &&
          readinessClass.includes("model-readiness--loading"),
      );
      if (!sawMeasuredLoading) {
        throw new Error(
          `The model became ready without exposing measurable loading progress. States: ${JSON.stringify(snapshots)}`,
        );
      }
      console.log(
        `Manifest V3 extension reports model progress, reaches Ready, and enables Discover (${snapshots.length} observed states).`,
      );
      await cdp.send("Browser.close");
      process.exitCode = 0;
      break;
    }
    if (snapshot.readinessClass.includes("model-readiness--error")) {
      throw new Error(
        `Extension model initialization failed: ${snapshot.readinessText}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (process.exitCode !== 0) {
    throw new Error(
      `Extension model initialization timed out. States: ${JSON.stringify(snapshots)}`,
    );
  }
} catch (error) {
  if (browserErrors) process.stderr.write(browserErrors);
  throw error;
} finally {
  await terminateBrowser(child);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function terminateBrowser(browserProcess) {
  if (browserProcess.exitCode != null) return;
  const gracefulExit = new Promise((resolve) =>
    browserProcess.once("exit", resolve),
  );
  browserProcess.kill("SIGTERM");
  await Promise.race([
    gracefulExit,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (browserProcess.exitCode != null) return;
  const forcedExit = new Promise((resolve) =>
    browserProcess.once("exit", resolve),
  );
  browserProcess.kill("SIGKILL");
  await Promise.race([
    forcedExit,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

function extensionIdFromPath(path) {
  return createHash("sha256")
    .update(path)
    .digest("hex")
    .slice(0, 32)
    .split("")
    .map((digit) =>
      String.fromCharCode("a".charCodeAt(0) + Number.parseInt(digit, 16)),
    )
    .join("");
}

async function evaluate(cdp, sessionId, expression) {
  const response = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true },
    sessionId,
  );
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text,
    );
  }
  return response.result.value;
}

async function findChromium() {
  const candidates = [
    process.env.CHROME_BIN,
    "/opt/homebrew/bin/chromium",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next Chromium location.
    }
  }
  throw new Error(
    "A Chromium build that supports --load-extension is required. Set CHROME_BIN to its executable.",
  );
}

function connectCdpPipe(browserProcess) {
  const input = browserProcess.stdio[3];
  const output = browserProcess.stdio[4];
  let nextId = 0;
  let buffer = Buffer.alloc(0);
  const pending = new Map();

  const rejectPending = (error) => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };
  output.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    let separator = buffer.indexOf(0);
    while (separator !== -1) {
      const payload = buffer.subarray(0, separator).toString("utf8");
      buffer = buffer.subarray(separator + 1);
      if (payload) {
        const message = JSON.parse(payload);
        if (message.id && pending.has(message.id)) {
          const { resolve, reject } = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result);
        }
      }
      separator = buffer.indexOf(0);
    }
  });
  output.on("error", rejectPending);
  browserProcess.on("error", rejectPending);
  browserProcess.on("exit", (code) => {
    if (pending.size > 0) {
      rejectPending(new Error(`Chromium exited with ${code}.`));
    }
  });

  return {
    send(method, params = {}, sessionId) {
      const id = (nextId += 1);
      return new Promise((resolve, reject) => {
        pending.set(id, { reject, resolve });
        const message = Buffer.from(
          JSON.stringify({ id, method, params, sessionId }),
        );
        input.write(Buffer.concat([message, Buffer.from([0])]));
      });
    },
  };
}
