#!/usr/bin/env node
// Scrape sekali-jalan: ambil daftar kamera dari 4 sumber, normalisasi, tulis data/cameras.json.
// Jalankan manual bila sumber berubah: node scripts/scrape.mjs  (Node >= 18, tanpa dependensi).
// Detail tiap sumber & aturan normalisasi: docs/data-sources.md

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "cameras.json");

async function fetchWithTimeout(url, ms, opts = {}) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { "User-Agent": "cctv-aggregator/1.0 (+snapshot generator)" },
      ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch {
    return null; // sumber gagal != aplikasi gagal
  }
}

// ---- Kota Bandung ----
async function bandung() {
  const res = await fetchWithTimeout("https://pelindung.bandung.go.id:8443/api/cek", 10000);
  if (!res) return { cameras: [], degraded: true };
  const raw = await res.json();

  const fixUrl = (u) => {
    let s = String(u || "").trim().replace(/^https?:\/+/i, "https://"); // perbaiki typo "https:/"
    if (s.startsWith("https://pelindung.bandung.go.id/"))
      s = s.replace("https://pelindung.bandung.go.id/", "https://pelindung.bandung.go.id:3443/");
    if (s.endsWith(".m3u")) s += "8";
    return s;
  };

  const cameras = raw
    .filter((c) => c.stream_cctv)
    .map((c) => {
      const dinas = (c.dinas || "").trim();
      return {
        id: `bandung:${c.id}`,
        source: "bandung",
        name: (c.cctv_name || "").trim(),
        ...(dinas && dinas.toLowerCase() !== "as" ? { dinas } : {}),
        area: "Kota Bandung",
        lat: parseFloat(c.lat),
        lng: parseFloat(c.lng),
        streamType: "hls",
        streamUrl: fixUrl(c.stream_cctv),
      };
    });
  return { cameras, degraded: false };
}

// ---- Kab. Bandung (data hardcode di HTML) ----
async function kabBandung() {
  const res = await fetchWithTimeout("https://dishub.bandungkab.go.id/cctv/", 10000);
  if (!res) return { cameras: [], degraded: true };
  const html = await res.text();
  const noComments = html.replace(/\/\*[\s\S]*?\*\//g, ""); // jangan tangkap blok cctvData yang dikomentari
  const m = noComments.match(/const cctvData = (\[[\s\S]*?\]);/);
  if (!m) return { cameras: [], degraded: true };

  const entryRe =
    /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*code:\s*"([^"]*)",\s*coordinates:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\s*,\s*streamUrl:\s*"([^"]+)"/g;

  const cameras = [...m[1].matchAll(entryRe)].map((e) => ({
    id: `kab-bandung:${e[1]}`,
    source: "kab-bandung",
    name: e[2].trim(),
    area: "Kab. Bandung",
    lat: parseFloat(e[4]),
    lng: parseFloat(e[5]),
    streamType: "hls",
    streamUrl: e[6],
  }));
  return { cameras, degraded: false };
}

// ---- Kab. Bandung Barat ----
async function bandungBarat() {
  const res = await fetchWithTimeout("https://atcs.bandungbaratkab.go.id/get-cctv", 10000);
  if (!res) return { cameras: [], degraded: true };
  const json = await res.json();

  const cameras = (json.data || []).map((c) => {
    const uuid = String(c.link || "").split("/").pop().replace(/\.html$/, "");
    const [lat, lng] = String(c.koordinat || "")
      .split(",")
      .map((x) => parseFloat(x));
    return {
      id: `bandung-barat:${c.alias || uuid}`,
      source: "bandung-barat",
      name: (c.nama_cctv || "").trim(),
      area: "Kab. Bandung Barat",
      lat,
      lng,
      streamType: "hls",
      streamUrl: `https://atcs-dishubkbb.urbanaccess.net/memfs/${uuid}.m3u8`,
    };
  });
  return { cameras, degraded: false };
}

// ---- Kota Cimahi (diblokir Cloudflare dari luar Indonesia; hasil kosong wajar) ----
async function cimahi() {
  const res = await fetchWithTimeout("https://demo-cctv.cimahikota.go.id/api/v1/channels", 6000);
  if (!res) return { cameras: [], degraded: true };
  const channels = await res.json();
  const cameras = (Array.isArray(channels) ? channels : []).map((c) => ({
    id: `cimahi:${c.channel}`,
    source: "cimahi",
    name: (c.name || "").trim(),
    area: "Kota Cimahi",
    streamType: "embed",
    embedUrl: `https://demo-cctv.cimahikota.go.id/embed?channel=${c.channel}`,
  }));
  return { cameras, degraded: false };
}

const order = ["bandung", "kab-bandung", "cimahi", "bandung-barat"];
const results = await Promise.all([bandung(), kabBandung(), cimahi(), bandungBarat()]);

const cameras = results
  .flatMap((r) => r.cameras)
  .sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source) || a.name.localeCompare(b.name));

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(cameras, null, 2) + "\n", "utf8");

for (const [name, r] of [["bandung", results[0]], ["kab-bandung", results[1]], ["cimahi", results[2]], ["bandung-barat", results[3]]])
  console.log(`${name.padEnd(14)} ${String(r.cameras.length).padStart(4)} kamera${r.degraded ? "  [DEGRADED - sumber tidak terjangkau]" : ""}`);
console.log(`total          ${String(cameras.length).padStart(4)} kamera -> ${OUT}`);
