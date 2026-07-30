import { createReadStream } from "node:fs";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import {
  dirname,
  extname,
  join,
  normalize,
} from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chromium = await findChromium();
const profile = await mkdtemp(
  join(tmpdir(), "indie-keyword-finder-semantic-"),
);
const server = createProjectServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const targetUrl =
  `http://127.0.0.1:${address.port}/tests/ui/semantic-runtime-harness.html`;
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
    url: targetUrl,
  });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    flatten: true,
    targetId,
  });
  await cdp.send("Runtime.enable", {}, sessionId);

  const deadline = Date.now() + 60_000;
  let complete = false;
  while (!complete && Date.now() < deadline) {
    const evaluated = await cdp.send(
      "Runtime.evaluate",
      {
        expression:
          "document.documentElement.dataset.semanticComplete === 'true'",
        returnByValue: true,
      },
      sessionId,
    );
    complete = evaluated.result.value === true;
    if (!complete) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!complete) {
    const error = await evaluateText(
      cdp,
      sessionId,
      "#semantic-error",
    );
    throw new Error(
      error || "Packaged semantic runtime timed out.",
    );
  }

  const result = JSON.parse(
    await evaluateText(cdp, sessionId, "#semantic-result"),
  );
  if (
    result?.status !== "ready" ||
    result.accepted?.length !== 1 ||
    result.accepted[0] !== "travel itinerary template" ||
    result.rejected?.length !== 5
  ) {
    throw new Error(
      `Unexpected semantic result: ${JSON.stringify(result)}`,
    );
  }
  console.log(
    "Packaged on-device model keeps the itinerary query and rejects five off-topic queries.",
  );
  await cdp.send("Browser.close");
} catch (error) {
  if (browserErrors) process.stderr.write(browserErrors);
  throw error;
} finally {
  if (child.exitCode == null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
  await new Promise((resolve) => server.close(resolve));
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

async function evaluateText(cdp, sessionId, selector) {
  const result = await cdp.send(
    "Runtime.evaluate",
    {
      expression:
        `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ""`,
      returnByValue: true,
    },
    sessionId,
  );
  return result.result.value;
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
      ".json": "application/json",
      ".mjs": "text/javascript; charset=utf-8",
      ".onnx": "application/octet-stream",
      ".wasm": "application/wasm",
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
    "Chrome or Chromium is required for semantic runtime tests. Set CHROME_BIN to its executable.",
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
