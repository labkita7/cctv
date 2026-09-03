import { useEffect, useMemo, useState } from "react";
import { cameras, areas, dinasList } from "./lib/cameras";
import type { Camera } from "./lib/types";
import { Filters } from "./components/Filters";
import { CameraCard } from "./components/CameraCard";
import { CctvPlayer } from "./components/CctvPlayer";
import { CctvMap } from "./components/CctvMap";

const PAGE_SIZE = 12;

function readQuery() {
  const p = new URLSearchParams(location.search);
  return { q: p.get("q") ?? "", area: p.get("area") ?? "", dinas: p.get("dinas") ?? "" };
}

export default function App() {
  const [initial] = useState(readQuery);
  const [q, setQ] = useState(initial.q);
  const [area, setArea] = useState(initial.area);
  const [dinas, setDinas] = useState(initial.dinas);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Camera | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cameras.filter(
      (c) =>
        (!area || c.area === area) &&
        (!dinas || (c.dinas ?? "Lainnya") === dinas) &&
        (!needle || c.name.toLowerCase().includes(needle)),
    );
  }, [q, area, dinas]);

  // State filter dipantulkan ke URL agar hasil filter bisa dibagikan.
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (area) p.set("area", area);
    if (dinas) p.set("dinas", dinas);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, [q, area, dinas]);
  const shown = filtered.slice(0, visible);

  return (
    <>
      <header className="topbar">
        <h1>CCTV Bandung Raya</h1>
        <p className="sub">
          {cameras.length} kamera publik · Kota Bandung · Kab. Bandung · Kab. Bandung Barat
        </p>
      </header>

      <Filters
        q={q}
        area={area}
        dinas={dinas}
        areas={areas}
        dinasList={dinasList}
        view={view}
        onQ={(v) => {
          setQ(v);
          setVisible(PAGE_SIZE);
        }}
        onArea={(v) => {
          setArea(v);
          setVisible(PAGE_SIZE);
        }}
        onDinas={(v) => {
          setDinas(v);
          setVisible(PAGE_SIZE);
        }}
        onView={setView}
      />

      {view === "grid" ? (
        <>
          {filtered.length === 0 ? (
            <p className="empty">Tidak ada kamera yang cocok.</p>
          ) : (
            <div className="grid">
              {shown.map((c) => (
                <CameraCard key={c.id} cam={c} onWatch={setSelected} />
              ))}
            </div>
          )}
          {visible < filtered.length && (
            <div className="more">
              <button onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Muat lagi ({filtered.length - visible} tersisa)
              </button>
            </div>
          )}
        </>
      ) : (
        <CctvMap cams={filtered} onWatch={setSelected} />
      )}

      <footer className="footer">
        <p>
          Data per {__BUILD_DATE__} — milik masing-masing Pemda, hanya ditampilkan ulang:
        </p>
        <ul>
          <li>
            <a href="https://pelindung.bandung.go.id" target="_blank" rel="noreferrer">
              Pelindung Kota Bandung (DISKOMINFO &amp; Dishub)
            </a>
          </li>
          <li>
            <a href="https://dishub.bandungkab.go.id/cctv" target="_blank" rel="noreferrer">
              Dishub Kab. Bandung
            </a>
          </li>
          <li>
            <a href="https://atcs.bandungbaratkab.go.id" target="_blank" rel="noreferrer">
              ATCS Dishub Kab. Bandung Barat
            </a>
          </li>
        </ul>
        <p className="muted">
          Cimahi belum tersedia — buka{" "}
          <a href="https://smartcity.cimahikota.go.id/cctv" target="_blank" rel="noreferrer">
            smartcity.cimahikota.go.id/cctv
          </a>
          .
        </p>
      </footer>

      {selected && (
        <div className="backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <strong>{selected.name}</strong>
                <span className="badge">{selected.area}</span>
                {selected.dinas && <span className="badge">{selected.dinas}</span>}
              </div>
              <button className="close" onClick={() => setSelected(null)} aria-label="Tutup">
                ✕
              </button>
            </div>
            <CctvPlayer key={selected.id} cam={selected} />
          </div>
        </div>
      )}
    </>
  );
}
