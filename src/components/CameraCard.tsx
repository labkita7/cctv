import type { Camera } from "../lib/types";

const SOURCE_LABEL: Record<Camera["source"], string> = {
  bandung: "Kota Bandung",
  "kab-bandung": "Kab. Bandung",
  "bandung-barat": "KBB",
  cimahi: "Cimahi",
};

export function CameraCard({ cam, onWatch }: { cam: Camera; onWatch: (c: Camera) => void }) {
  return (
    <button className="card" onClick={() => onWatch(cam)}>
      <span className={`pin pin-${cam.source}`} aria-hidden />
      <strong className="card-name">{cam.name}</strong>
      <span className="card-meta">
        {cam.area}
        {cam.dinas ? ` · ${cam.dinas}` : ""} · {SOURCE_LABEL[cam.source]}
      </span>
      <span className="watch">▶ Tonton</span>
    </button>
  );
}
