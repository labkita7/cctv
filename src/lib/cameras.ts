import type { Camera } from "./types";
import camerasJson from "../../data/cameras.json";

// Snapshot statis hasil scripts/scrape.mjs — TIDAK ada fetch metadata saat runtime.
export const cameras = camerasJson as Camera[];

export const areas = [...new Set(cameras.map((c) => c.area))].sort();

export const dinasList = [
  ...new Set(cameras.filter((c) => c.source === "bandung").map((c) => c.dinas ?? "Lainnya")),
].sort();

export function playUrl(c: Camera): string {
  if (c.streamType === "embed") return c.embedUrl ?? "";
  // Bandung: CORS upstream terkunci → lewat proxy jalur-based /p/{host}/{path}.
  // Kab. Bandung & KBB: CORS upstream `*` → diputar langsung (query ?api= milik
  // Kab. Bandung harus tetap utuh).
  if (c.source === "bandung") return "/p/" + (c.streamUrl ?? "").slice("https://".length);
  return c.streamUrl ?? "";
}
