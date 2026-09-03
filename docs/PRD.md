# PRD — Web Agregator CCTV Bandung Raya

Versi: 1.2 (2026-09-03). Dasar teknis sumber data: `docs/data-sources.md`.

**Keputusan arsitektur:** data kamera di-scrape **sekali di awal** dan disimpan sebagai snapshot statis di repo (`data/cameras.json`, 473 kamera). Web memakai snapshot itu langsung — **tidak ada fetching metadata upstream saat runtime**. Jika sumber berubah, snapshot diperbarui manual dengan `node scripts/scrape.mjs`; web tidak perlu otomatis mengikuti perubahan sumber.

**Keputusan scope (v1.2): Cimahi DITUNDA.** Sumber datanya (`demo-cctv.cimahikota.go.id`) diblokir Cloudflare dan tidak tersedia lewat agregator mana pun yang sudah dicek, jadi MVP mencakup **3 wilayah: Kota Bandung, Kab. Bandung, Kab. Bandung Barat (473 kamera)**. Cimahi tidak dihapus dari skema data dan script scrape (tetap best-effort, hasil 0) — bila kelak scrape dijalankan dari jaringan Indonesia dan berhasil, channel Cimahi masuk snapshot dan fitur iframe-nya tinggal dipakai, tanpa perombakan.

## 1. Latar Belakang

Pemerintah daerah di Bandung Raya menyiarkan CCTV lalu lintas publik di situs masing-masing: Kota Bandung (pelindung.bandung.go.id), Kab. Bandung (dishub.bandungkab.go.id/cctv), Kota Cimahi (smartcity.cimahikota.go.id/cctv), dan Kab. Bandung Barat (atcs.bandungbaratkab.go.id). Pengguna yang ingin memantau kondisi jalan lintas wilayah harus membuka beberapa situs berbeda.

## 2. Tujuan

Satu web ringan yang menggabungkan CCTV publik tiga wilayah (Bandung, Kab. Bandung, Kab. Bandung Barat): cari kamera, lihat live, lihat lokasi di peta — dalam satu halaman, tanpa login.

## 3. Pengguna & Use Case

- **Warga / komuter**: cek kondisi jalan titik tertentu sebelum berangkat (mobile & desktop).
- **Ojol / pengemudi**: cari kamera terdekat via pencarian nama atau peta.
- **Pengamat / akademisi / media**: membandingkan beberapa lokasi sekaligus (grid multi-kamera).

## 4. Ruang Lingkup

### MVP (didahulukan)

1. Halaman utama berisi: daftar/grid kamera + pemutar live + peta (Leaflet, OpenStreetMap) dengan marker semua kamera.
2. Katalog kamera dari snapshot statis `data/cameras.json` (skema terpadu, hasil normalisasi sesuai `docs/data-sources.md`).
3. Pencarian nama kamera + filter per wilayah (3 area) dan per dinas (Kota Bandung).
4. Pemutaran HLS via hls.js (Bandung lewat proxy, Kab. Bandung & KBB langsung).
5. Proxy server-side untuk stream Bandung saja (CORS upstream terkunci ke domain mereka).
6. Catatan statis kecil bahwa Cimahi belum tersedia + tautan ke situs aslinya (satu baris di footer, bukan tab/filter).
7. Responsive mobile-first, tanpa login, tanpa iklan.

### Non-MVP / ditunda (jangan dikerjakan dulu)

- **Cimahi**: sumber data tidak terjangkau (diblokir Cloudflare; tidak ada di agregator pihak ketiga — lihat `docs/data-sources.md` bagian 3 & 5). Ditunda sampai datanya bisa diambil.
- Sinkronisasi otomatis / scheduling scrape, health-check massal 473 stream.
- Integrasi katalog pihak ketiga (mis. pantaucctv.com) sebagai sumber kamera atau thumbnail.
- Penyimpanan rekaman/snapshot historis, deteksi objek/analitik AI.
- PWA/offline, notifikasi, multi-bahasa, akun pengguna, favorit tersimpan di server.
- Chat/komentar.

## 5. Fitur Utama (spesifikasi singkat)

### 5.1 Katalog kamera (snapshot statis)

`data/cameras.json` — array 473 kamera (bandung 406, kab-bandung 9, bandung-barat 58; cimahi 0 per keputusan scope), skema:

```json
{
  "id": "bandung:6f1065bd-f94a-4730-b44b-1c4896b5fed3",
  "source": "bandung | kab-bandung | cimahi | bandung-barat",
  "name": "CCTV ALUN-ALUN 01 - BANCEUY",
  "dinas": "DISKOMINFO",
  "area": "Kota Bandung",
  "lat": -6.921062, "lng": 107.606394,
  "streamType": "hls | embed",
  "streamUrl": "https://... .m3u8",
  "embedUrl": "https://demo-cctv.cimahikota.go.id/embed?channel=1"
}
```

- Diimpor langsung oleh aplikasi (static import) — tanpa endpoint API, tanpa cache, tanpa fetch saat runtime.
- `streamUrl` untuk source `bandung` adalah URL upstream asli; aplikasi mengubahnya ke jalur proxy saat memutar: `/p/` + `streamUrl` tanpa skema `https://`.
- Regenerasi manual: `node scripts/scrape.mjs` (Node ≥ 18, tanpa dependensi) menimpa `data/cameras.json`. Staleness diterima sesuai keputusan arsitektur.

### 5.2 Pemutar

- Grid default 12 kamera per halaman; klik kamera → pemutar besar (modal).
- HLS: hls.js (fallback `video.canPlayType('application/vnd.apple.mpegurl')` untuk Safari).
- Stream `bandung` lewat proxy jalur-based: `/p/pelindung.bandung.go.id:3443/video/DAHUA/DepanTo.m3u8` → segmen `.ts` relatif di manifest otomatis resolve kembali ke `/p/...` tanpa rewrite manifest. Host di-proxy di-allowlist HANYA `pelindung.bandung.go.id` agar proxy tidak jadi open proxy.
- Stream `kab-bandung` dan `bandung-barat` diputar **langsung** dari upstream (CORS mereka `*`) — tidak lewat proxy.
- Pemutar tetap mendukung cabang `streamType: "embed"` (iframe) — tidak dipakai di MVP, tapi bikin one-liner agar snapshot Cimahi di masa depan langsung jalan tanpa refactor.
- Mute default + autoplay, tombol fullscreen, indikator "LIVE".
- Kamera mati (mis. 3 URL DISHUB upstream yang sudah 404) → placeholder "kamera tidak tersedia" + tombol coba lagi; kamera lain tidak boleh ikut terdampak.

### 5.3 Peta

- Leaflet + tile OpenStreetMap, marker per kamera, popup nama + tombol "Tonton".
- Klik marker = buka pemutar; filter aktif juga memfilter marker.

### 5.4 Pencarian & filter

- Search box nama kamera (case-insensitive, debounce 300 ms).
- Filter wilayah (tab: Semua, Kota Bandung, Kab. Bandung, Kab. Bandung Barat) + dropdown dinas untuk Kota Bandung.
- State filter di URL (query param) agar bisa dibagikan.

### 5.5 Status & atribusi

- Catatan statis di footer: "Data per <tanggal snapshot — lihat tanggal commit data/cameras.json>" dan satu baris "Cimahi belum tersedia — buka smartcity.cimahikota.go.id/cctv".
- Footer: atribusi tiga instansi + tautan situs aslinya + "Data milik masing-masing Pemda, hanya ditampilkan ulang".

## 6. Arsitektur Teknis

- **Stack**: React + TypeScript + Vite (SPA, tanpa framework meta) — hls.js, Leaflet (vanilla), CSS biasa. Tanpa database, tanpa login, tanpa API metadata.
- **Proxy**: satu modul Node zero-dependensi `proxy/pelindung.mjs` (`GET /p/{host}/{path}` — allowlist host `pelindung.bandung.go.id` port 3443/8443, pass-through body, teruskan query string, timeout 15 s). Dipakai dua kali: sebagai middleware Vite saat `npm run dev`, dan oleh `server.mjs` — server statis zero-dependensi untuk produksi yang melayani hasil `vite build` (dist/) + proxy. Deploy = `npm run build && npm run serve`.
- **Rute**:
  - `GET /p/{host}/{path}` — proxy streaming Bandung (allowlist ketat agar tidak jadi open proxy).
  - `/` — SPA halaman utama (grid + peta + filter), memuat `data/cameras.json` via static import.
- **Pemutaran langsung di browser** (tanpa proxy): stream Kab. Bandung dan KBB.
- **Cimahi (ditunda)**: snapshot berisi 0 kamera. Script scrape tetap mencobanya secara best-effort — bila suatu saat dijalankan dari jaringan yang lolos Cloudflare, channel masuk snapshot sebagai `streamType: "embed"` dan dimainkan sebagai iframe passthrough oleh browser pengguna; UI tinggal menambah tab wilayahnya.
- **Alur data satu arah**: snapshot statis → filter/pencarian di klien → pemutaran (langsung / via proxy / iframe).

## 7. Non-Functional

- **Performa**: halaman interaktif < 3 s pada koneksi 3G cepat; tidak ada request upstream sama sekali sampai user membuka kamera; lazy-load pemutar (hanya kamera terlihat yang memuat stream).
- **Batas beban upstream**: satu-satunya trafik upstream adalah manifest+segmen untuk kamera Bandung yang sedang dibuka user (via proxy) dan stream langsung Kab. Bandung/KBB. Tidak ada polling/scrape berkala.
- **Ketahanan**: kamera mati di upstream → ditangani per-kamera di pemutar, tidak pernah memblokir halaman.
- **Keamanan**: tanpa kredensial/rahasia di repo; proxy allowlist host; validasi input query; tidak menyimpan data pengguna.
- **Aksesibilitas & mobile**: DOM semantik, kontras memadai, kontrol pemutar bisa disentuh.

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Upstream mengubah endpoint/memindah kamera | Snapshot usang | Diterima sesuai keputusan arsitektur; regenerasi manual `node scripts/scrape.mjs` saat dibutuhkan |
| Kamera di snapshot sudah mati di upstream | Kamera "tidak tersedia" saat dibuka | Placeholder + tombol coba lagi di pemutar; bukan penghalang |
| CORS Bandung terkunci | Stream Bandung tak jalan tanpa proxy | Proxy jalur-based `/p/...` (dirancang, allowlist host) |
| Proxy disalahgunakan pihak ketiga | Beban/beban hukum | Allowlist host ketat + (opsional) batas ukur/rate sederhana |

## 9. Metrik Sukses (MVP diterima bila)

- 473 kamera dari snapshot tampil dan dapat dicari/difilter/dilihat di peta.
- Minimal 1 kamera per wilayah (Bandung via proxy, Kab. Bandung, KBB langsung) berhasil diputar live di browser.
- Filter wilayah + pencarian bekerja dan state-nya ada di URL.
- Kamera yang mati menampilkan placeholder tanpa merusak kamera lain.
- Footer memuat atribusi + catatan Cimahi + tanggal snapshot.
- Lighthouse mobile: Performance ≥ 85, tanpa error console.

## 10. Referensi

- Analisa endpoint terverifikasi + aturan normalisasi: `docs/data-sources.md`.
- Snapshot data: `data/cameras.json`; generator: `scripts/scrape.mjs`.
- Rencana pengerjaan bertahap: `docs/TODO.md`.
