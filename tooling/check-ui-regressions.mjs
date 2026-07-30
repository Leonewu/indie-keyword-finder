import { createReadStream } from "node:fs";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chromium = await findChromium();
const profile = await mkdtemp(join(tmpdir(), "indie-keyword-finder-ui-"));
const server = createProjectServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const address = server.address();
const targetUrl =
  `http://127.0.0.1:${address.port}/tests/ui/sidepanel-harness.html`;
const child = spawn(chromium, [
  "--headless=new",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-sandbox",
  "--remote-debugging-pipe",
  `--user-data-dir=${profile}`,
  "about:blank",
], {
  stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"],
});

try {
  const cdp = connectCdpPipe(child);
  const { targetId } = await cdp.send("Target.createTarget", {
    url: targetUrl,
  });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    flatten: true,
    targetId,
  });
  await cdp.send("Runtime.enable", {}, sessionId);

  const deadline = Date.now() + 8_000;
  let complete = false;
  while (!complete && Date.now() < deadline) {
    const result = await cdp.send(
      "Runtime.evaluate",
      {
        expression:
          "document.documentElement.dataset.regressionComplete === 'true'",
        returnByValue: true,
      },
      sessionId,
    );
    complete = result.result.value === true;
    if (!complete) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!complete) throw new Error("Side Panel harness timed out.");

  const result = await cdp.send(
    "Runtime.evaluate",
    {
      expression: "document.querySelector('#regression-result').textContent",
      returnByValue: true,
    },
    sessionId,
  );
  const checks = JSON.parse(result.result.value);
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  if (failures.length > 0) {
    console.error(`Side Panel regressions: ${failures.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Side Panel focus, width, and reference-term regressions pass.");
  }
  await cdp.send("Browser.close");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}

function createProjectServer() {
  return createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const requested = normalize(decodeURIComponent(url.pathname)).replace(
      /^(\.\.(\/|\\|$))+/,
      "",
    );
    const path = join(root, requested);
    if (!path.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const contentTypes = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
    };
    response.setHeader(
      "Content-Type",
      contentTypes[extname(path)] ?? "application/octet-stream",
    );
    const stream = createReadStream(path);
    stream.on("error", () => response.writeHead(404).end("Not found"));
    stream.pipe(response);
  });
}

async function findChromium() {
  const candidates = [
    process.env.CHROME_BIN,
    "/opt/homebrew/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Chrome/Chromium location.
    }
  }
  throw new Error(
    "Chrome or Chromium is required for Side Panel regression tests. Set CHROME_BIN to its executable.",
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
