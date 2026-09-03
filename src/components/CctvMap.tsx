import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Camera } from "../lib/types";

const CENTER: [number, number] = [-6.9, 107.6];

const PIN = `
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="6" fill="#22c55e" stroke="#063" stroke-width="1"/>
  </svg>`;

export function CctvMap({ cams, onWatch }: { cams: Camera[]; onWatch: (c: Camera) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const watchRef = useRef(onWatch);
  watchRef.current = onWatch;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { center: CENTER, zoom: 11, preferCanvas: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    const icon = L.divIcon({ className: "cam-pin", html: PIN, iconSize: [14, 14] });
    for (const cam of cams) {
      L.marker([cam.lat, cam.lng], { icon, title: cam.name })
        .bindPopup(
          `<strong>${cam.name.replace(/</g, "&lt;")}</strong><br/><small>${cam.area}</small>`,
        )
        .on("popupopen", (e) => {
          const btn = document.createElement("button");
          btn.textContent = "▶ Tonton";
          btn.className = "popup-watch";
          btn.onclick = () => watchRef.current(cam);
          e.popup.getElement()?.querySelector(".leaflet-popup-content")?.append(btn);
        })
        .addTo(group);
    }
  }, [cams]);

  return <div ref={divRef} className="map" />;
}
