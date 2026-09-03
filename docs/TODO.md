# TODO — Agregator CCTV Bandung Raya

Panduan pengerjaan untuk implementator AI. Bekerja bertahap: selesaikan fase berurutan, jangan lompat. Setiap fase punya langkah eksplisit dan verifikasi — jangan tandai selesai sebelum verifikasinya lulus. Baca `docs/data-sources.md` (analisa sumber) dan `docs/PRD.md` (spesifikasi) sebelum mulai.

**Arsitektur data (SUDAH BERES, jangan dikerjakan ulang):** daftar kamera adalah snapshot statis `data/cameras.json` (473 kamera: bandung 406, kab-bandung 9, bandung-barat 58). Tidak ada fetch metadata saat runtime. **Cimahi ditunda** — snapshot berisi 0 kamera Cimahi (sumber diblokir Cloudflare); JANGAN buat tab/filter/pesan khusus Cimahi selain satu baris catatan di footer (Fase 5). Regenerasi manual (hanya bila diminta): `node scripts/scrape.mjs`.

**Stack (jangan diganti):** React + TypeScript + Vite (SPA, TANPA Next.js atau framework meta lain), hls.js, Leaflet vanilla, CSS biasa. Proxy = modul Node zero-dep `proxy/pelindung.mjs` (dev: middleware Vite; produksi: `server.mjs` melayani dist/ + proxy). Tanpa database, tanpa login.

**Cara memutar tiap source (penting):**

| source | streamType | Cara main |
|---|---|---|
| `bandung` | hls | `"/p/" + streamUrl.slice("https://".length)` → lewat proxy `/p/...` (CORS upstream terkunci) |
| `kab-bandung` | hls | `streamUrl` langsung (CORS `*`, query `?api=` HARUS disertakan apa adanya) |
| `bandung-barat` | hls | `streamUrl` langsung (CORS `*`) |
| `cimahi` | embed | `<iframe src={embedUrl}>` — tidak ada di snapshot saat ini; cabang ini tetap diimplementasikan sebagai one-liner agar nanti langsung jalan bila Cimahi ditambahkan |

---

## Fase 0 — Fondasi repo

- [x] Scaffold Vite + React + TS di root (`package.json`, `vite.config.ts`, `index.html`, `src/`) tanpa menimpa file yang ada.
- [x] `npm i react react-dom hls.js leaflet` + `npm i -D typescript vite @vitejs/plugin-react @types/*`.
- [x] `data/cameras.json` tetap ada; `.hoplite/settings.json`: setup `npm install`, run `npm run dev -- --host 0.0.0.0 --port 3000`.
- [x] Verifikasi: `npm run build` lulus tanpa error.

## Fase 1 — Data & helper pemutaran

- [x] `src/lib/types.ts` — tipe `Camera` sesuai skema di `docs/PRD.md` 5.1.
- [x] `src/lib/cameras.ts` — static import `data/cameras.json`; ekspor kamera, area unik, dinas unik, dan `playUrl()` (bandung → `/p/…`, lainnya → `streamUrl` langsung, embed → `embedUrl`).
- [x] Verifikasi: aplikasi mencetak 473 kamera, 3 area; contoh `playUrl` tiap source benar.

## Fase 2 — Proxy stream Bandung

- [x] `proxy/pelindung.mjs` — handler proxy GET zero-dependensi:
  - Allowlist host HANYA `pelindung.bandung.go.id` (port 3443/8443); selain itu → 403. (Path format: `/p/{host}/{path}`.)
  - Fetch upstream `https://{host}/{path}` timeout 15 s, teruskan query string, pipe `response.body` apa adanya (jangan buffer seluruh segmen), teruskan `Content-Type`.
  - Kenapa jalur-based: segmen `.ts` di manifest ditulis RELATIF, jadi dengan prefix `/p/{host}/...` URL relatif otomatis resolve kembali ke proxy — TIDAK perlu rewrite isi manifest.
- [x] `vite.config.ts` — pasang handler sebagai middleware `/p/` saat dev; `server.mjs` — server statis produksi (dist/ + proxy, sama-sama pakai handler).
- [x] Verifikasi: `curl -s localhost:3000/p/pelindung.bandung.go.id:3443/video/DAHUA/DepanTo.m3u8` mengembalikan `#EXTM3U...`; `curl -o /dev/null -w "%{http_code}" localhost:3000/p/evil.com/x` → 403.

## Fase 3 — UI katalog + pemutar

- [x] `src/App.tsx` (client): pakai `src/lib/cameras.ts`; data statis, tidak perlu skeleton loading.
- [x] Filter: segmen wilayah (Semua / Kota Bandung / Kab. Bandung / Kab. Bandung Barat) + dropdown dinas + search box (debounce 300 ms). State di query param URL (`?area=&dinas=&q=`), sinkron dua arah.
- [x] Grid kartu kamera: nama, area, dinas, badge source. "Muat lagi" per 12.
- [x] Komponen `CctvPlayer`:
  - `streamType === "hls"` → `<video>` + hls.js via dynamic import (`Hls.isSupported()`; Safari native HLS). Autoplay muted, tombol fullscreen + mute via kontrol native, label LIVE.
  - `streamType === "embed"` → `<iframe src={embedUrl} allowfullscreen>` (one-liner, untuk masa depan Cimahi).
  - Error manifest/404 → overlay "Kamera tidak tersedia" + tombol coba lagi (destroy & re-create player). Kamera lain tidak boleh ikut gagal.
- [x] Klik kartu → modal pemutar besar (Esc/backdrop untuk tutup; saat modal ditutup `hls.destroy()` agar stream berhenti).
- [x] Pemutaran hanya di modal (bukan di tiap kartu) agar halaman ringan — pengganti requirement IntersectionObserver.
- [x] Verifikasi manual di browser: (1) kamera Bandung (via `/p/`) memutar (readyState 4, frame berjalan); (2) kamera Kab. Bandung & KBB memutar langsung; (3) search "ALUN-ALUN 01" memfilter ke 1 kamera; (4) refresh dengan `?area=Kab.+Bandung` mempertahankan filter; (5) tutup modal → stream berhenti.

## Fase 4 — Peta

- [x] Komponen `CctvMap` (Leaflet vanilla, tile OSM): marker per kamera terfilter (divIcon canvas, 473 marker tanpa clustering), popup nama + tombol "Tonton" membuka modal yang sama. Center `[-6.9, 107.6]`, zoom 11.
- [x] Toggle tampilan Grid / Peta; filter sama memfilter marker.
- [x] Verifikasi manual: marker muncul 473 (Semua) / 58 (KBB); klik marker → popup; tile OSM termuat.

## Fase 5 — Sentuhan akhir

- [x] Catatan statis di footer: "Data per <tanggal build>".
- [x] Footer atribusi: 3 instansi + link situs asli + "Data milik masing-masing Pemda, hanya ditampilkan ulang" + "Cimahi belum tersedia — buka smartcity.cimahikota.go.id/cctv".
- [x] Responsif mobile-first: grid auto-fill, filter sticky, modal pemutar lebar penuh di layar kecil.
- [x] Verifikasi akhir: `npm run build` lulus; tidak ada error console; bundle awal ~119 KB gzip (hls.js di-chunk terpisah via dynamic import). Lighthouse belum diukur — tidak ada tooling Lighthouse di sandbox; ukur saat deploy bila perlu.

---

## Aturan untuk implementator

1. JANGAN menambah fetch metadata saat runtime — katalog adalah `data/cameras.json` statis. Jangan mengubah file `data/cameras.json` manual; jika diminta refresh, jalankan `node scripts/scrape.mjs`.
2. Jangan menyalin token `api=` Kab. Bandung ke mana pun selain URL aslinya.
3. Kamera mati (404 upstream) adalah kondisi normal — tangani di pemutar, jangan hapus dari data, jangan blokir halaman.
4. Cimahi sengaja tidak ada — jangan buat tab/filter/badge khusus untuknya selain satu baris footer di Fase 5.
5. Jangan tambahkan fitur di luar PRD (login, rekaman, health-check massal, sinkron otomatis, integrasi pihak ketiga, dll.) meski terlihat mudah.
6. Setiap selesai fase: jalankan verifikasinya, catat hasil di PR description sebelum lanjut.
7. Jika stream Bandung via proxy gagal padahal manifest upstream masih 200: cek ulang allowlist host dan format path `/p/{host}/{path}` sebelum mengubah hal lain.
