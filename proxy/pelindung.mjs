// Proxy on-demand untuk stream HLS Kota Bandung — CORS upstream terkunci ke
// domain pelindung.bandung.go.id, jadi stream HARUS lewat server ini.
// Jalur-based: /p/{host}/{path?query} — segmen .ts relatif di manifest
// otomatis resolve kembali ke proxy tanpa perlu rewrite manifest.
import { Readable } from "node:stream";

const ALLOWED_HOSTS = new Set([
  "pelindung.bandung.go.id:3443",
  "pelindung.bandung.go.id:8443",
]);
const PREFIX = "/p/";

export async function handlePelindungProxy(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rel = url.pathname.slice(PREFIX.length);
    const slash = rel.indexOf("/");
    const host = slash === -1 ? rel : rel.slice(0, slash);
    if (!ALLOWED_HOSTS.has(host)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    const upstream = new URL(`https://${host}${slash === -1 ? "/" : rel.slice(slash)}`);
    upstream.search = url.search;
    const resp = await fetch(upstream, {
      headers: { referer: `https://${host.split(":")[0]}/` },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    res.statusCode = resp.status;
    const contentType = resp.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    if (resp.body) Readable.fromWeb(resp.body).pipe(res);
    else res.end();
  } catch {
    res.statusCode = 504;
    res.end("Upstream timeout");
  }
}
