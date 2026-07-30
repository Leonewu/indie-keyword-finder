import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelRevision = "751bff37182d3f1213fa05d7196b954e230abad9";
const modelBase =
  `https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/${modelRevision}`;
const assetCache = join(
  root,
  "node_modules",
  ".cache",
  "indie-keyword-finder",
);

const modelAssets = [
  {
    path: "config.json",
    sha256:
      "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7",
  },
  {
    path: "tokenizer.json",
    sha256:
      "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0",
  },
  {
    path: "tokenizer_config.json",
    sha256:
      "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3",
  },
  {
    path: "onnx/model_quantized.onnx",
    sha256:
      "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1",
  },
];

const runtimeAssets = [
  {
    source:
      "node_modules/@huggingface/transformers/dist/transformers.min.js",
    destination: "vendor/transformers.min.js",
    sha256:
      "13746ae88695b62e431fc5ebe3beb10a080d2081406047670639ce8c10a9ba25",
  },
  {
    source:
      "node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs",
    destination: "vendor/ort-wasm-simd-threaded.jsep.mjs",
    sha256:
      "08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9",
  },
  {
    source:
      "node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm",
    destination: "vendor/ort-wasm-simd-threaded.jsep.wasm",
    sha256:
      "c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39",
  },
];

export async function materializeSemanticAssets(extensionOutput) {
  const modelOutput = join(
    extensionOutput,
    "models",
    "Xenova",
    "all-MiniLM-L6-v2",
  );
  await Promise.all(
    modelAssets.map(async (asset) => {
      const cached = join(assetCache, "model", asset.path);
      await ensureRemoteAsset(
        `${modelBase}/${asset.path}`,
        cached,
        asset.sha256,
      );
      const destination = join(modelOutput, asset.path);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(cached, destination);
    }),
  );

  await Promise.all(
    runtimeAssets.map(async (asset) => {
      const source = join(root, asset.source);
      await assertDigest(source, asset.sha256);
      const destination = join(extensionOutput, asset.destination);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }),
  );

  const thirdPartyOutput = join(extensionOutput, "third-party");
  await mkdir(thirdPartyOutput, { recursive: true });
  await Promise.all([
    copyFile(
      join(root, "THIRD_PARTY_NOTICES.md"),
      join(thirdPartyOutput, "NOTICES.md"),
    ),
    copyFile(
      join(root, "node_modules", "@huggingface", "transformers", "LICENSE"),
      join(thirdPartyOutput, "Transformers.js-Apache-2.0.txt"),
    ),
    copyFile(
      join(root, "node_modules", "@huggingface", "jinja", "LICENSE"),
      join(thirdPartyOutput, "Hugging-Face-Jinja-MIT.txt"),
    ),
  ]);
  await ensureRemoteAsset(
    "https://raw.githubusercontent.com/microsoft/onnxruntime/v1.21.0/LICENSE",
    join(assetCache, "licenses", "ONNX-Runtime-MIT.txt"),
    "2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c",
  );
  await copyFile(
    join(assetCache, "licenses", "ONNX-Runtime-MIT.txt"),
    join(thirdPartyOutput, "ONNX-Runtime-MIT.txt"),
  );
}

async function ensureRemoteAsset(url, destination, sha256) {
  try {
    await assertDigest(destination, sha256);
    return;
  } catch {
    // Missing or stale cache entries are replaced from the pinned source.
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download semantic asset (${response.status}): ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== sha256) {
    throw new Error(`Semantic asset checksum mismatch: ${url}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, destination);
}

async function assertDigest(path, expected) {
  const actual = digest(await readFile(path));
  if (actual !== expected) {
    throw new Error(`Unexpected checksum for ${path}`);
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
