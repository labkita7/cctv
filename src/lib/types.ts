export interface Camera {
  id: string;
  source: "bandung" | "kab-bandung" | "cimahi" | "bandung-barat";
  name: string;
  dinas?: string;
  area: string;
  lat: number;
  lng: number;
  streamType: "hls" | "embed";
  streamUrl?: string;
  embedUrl?: string;
}
