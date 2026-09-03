interface FiltersProps {
  q: string;
  area: string;
  dinas: string;
  areas: string[];
  dinasList: string[];
  view: "grid" | "map";
  onQ: (v: string) => void;
  onArea: (v: string) => void;
  onDinas: (v: string) => void;
  onView: (v: "grid" | "map") => void;
}

export function Filters(p: FiltersProps) {
  return (
    <div className="filters">
      <input
        type="search"
        placeholder="Cari nama kamera…"
        value={p.q}
        onChange={(e) => p.onQ(e.target.value)}
        aria-label="Cari nama kamera"
      />
      <div className="tabs" role="tablist" aria-label="Wilayah">
        {["", ...p.areas].map((a) => (
          <button
            key={a || "all"}
            role="tab"
            aria-selected={p.area === a}
            className={p.area === a ? "active" : ""}
            onClick={() => p.onArea(a)}
          >
            {a || "Semua"}
          </button>
        ))}
      </div>
      <div className="row">
        <select value={p.dinas} onChange={(e) => p.onDinas(e.target.value)} aria-label="Dinas">
          <option value="">Semua dinas</option>
          {p.dinasList.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="viewtoggle">
          <button className={p.view === "grid" ? "active" : ""} onClick={() => p.onView("grid")}>
            Grid
          </button>
          <button className={p.view === "map" ? "active" : ""} onClick={() => p.onView("map")}>
            Peta
          </button>
        </div>
      </div>
    </div>
  );
}
