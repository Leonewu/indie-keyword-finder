import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const port = 4173;
const root = process.cwd();
const files = new Map([
  ["/prototype-identity.html", "prototypes/prototype-identity.html"],
  ["/prototype-identity.css", "prototypes/prototype-identity.css"],
  ["/prototype-identity.js", "prototypes/prototype-identity.js"],
  ["/preview.html", "prototypes/preview.html"],
  ["/preview-mock.js", "prototypes/preview-mock.js"],
  ["/sidebar.css", "apps/chrome-extension/src/sidebar.css"],
  ["/prototype-interface.css", "prototypes/prototype-interface.css"],
  ["/prototype-interface.js", "prototypes/prototype-interface.js"],
]);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/prototype-identity.html" : url.pathname;

  if (!files.has(pathname)) {
    response.writeHead(404).end("Prototype asset not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(pathname)],
  });
  createReadStream(join(root, files.get(pathname))).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Identity prototype: http://127.0.0.1:${port}/prototype-identity.html?variant=A`);
});
