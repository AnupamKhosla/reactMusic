// Serves dist/static the way GitHub Pages does, to test the plain-hosting build on the Mac:
//   npm run build:static && node scripts/serve-static.ts   ->  http://127.0.0.1:8788
// A file that exists is sent as it is; any other address gets 404.html with status 404 (as GitHub Pages does).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/static", import.meta.url));
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
};
const PORT = Number(process.env.PORT) || 8788;

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = path === "/" ? "/index.html" : path;
  try {
    const body = await readFile(root + file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(`${root}/404.html`));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Plain-hosting build on http://127.0.0.1:${PORT}`));
