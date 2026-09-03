// Server produksi zero-dependensi: melayani hasil `npm run build` (dist/)
// + proxy stream Bandung /p/. Jalankan: `npm run serve` (PORT bisa diubah).
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handlePelindungProxy } from "./proxy/pelindung.mjs";

const DIST = fileURLToPath(new URL("./dist", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/p/")) {
    await handlePelindungProxy(req, res);
    return;
  }
  // Static + SPA fallback (filter state ada di query param, tapi tetap aman).
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, safe);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(DIST, "index.html");
  }
  res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`CCTV Bandung Raya listening on :${PORT}`);
});
