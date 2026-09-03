# Hasil Rekayasa Balik Sumber Data CCTV Bandung Raya

Tanggal analisa: 2026-09-03. Semua endpoint di bawah sudah diverifikasi langsung (curl + browser nyata).
Total kamera terverifikasi: **473** (Bandung 406 + Kab. Bandung Barat 58 + Kab. Bandung 9; Cimahi tidak bisa dihitung, lihat catatan).

> **Status implementasi:** data sudah di-scrape sekali dan disimpan sebagai snapshot statis di [`data/cameras.json`](../data/cameras.json), dibuat oleh [`scripts/scrape.mjs`](../scripts/scrape.mjs) yang menerapkan semua aturan normalisasi di dokumen ini. Web memakai snapshot langsung tanpa fetch saat runtime; regenerasi hanya manual bila sumber berubah.

## 1. Kota Bandung — pelindung.bandung.go.id ("PELINDUNG")

Aplikasi React (CRA) dengan bundle tunggal `/static/js/bundle.js`.

**Daftar kamera (JSON, tanpa autentikasi):**

```
GET https://pelindung.bandung.go.id:8443/api/cek
```

Respons: array JSON, 406 item, skema:

```json
{
  "id": "6f1065bd-f94a-4730-b44b-1c4896b5fed3",
  "cctv_name": "CCTV ALUN-ALUN 01 - BANCEUY",
  "lat": "-6.921062009055424",
  "lng": "107.60639444644745",
  "stream_cctv": "https://pelindung.bandung.go.id:3443/video/DAHUA/DepanTo.m3u8",
  "dinas": "DISKOMINFO"
}
```

Distribusi `dinas`: DISKOMINFO 261, "as" 47 (kotor, artinya tidak diketahui), DPKP3 46, DISHUB 32, DSDABM 15, DPU ~15 (dari path stream), BCH 2, DPMPTSP 2, PDAM 1.

**Stream:** HLS live di port 3443, path `/video/{MEREK}/{nama}.m3u8` dengan merek: HIKSVISION (195), DAHUA (91), DPKP3 (58), DISHUB (30), DPU (15), HUAWEI (10), LAINNYA (1). Isi manifest = media playlist dengan segmen `.ts` RELATIF (mis. `DepanTo5.ts`). Terverifikasi live.

**CORS:** `Access-Control-Allow-Origin` DIKUNCI ke `https://pelindung.bandung.go.id` (untuk API 8443 dan stream 3443). Browser pihak ketiga TIDAK BISA memuat langsung → **wajib proxy server-side** untuk daftar maupun stream.

**Kualitas data (perlu normalisasi):**
- 6 URL typo `https:/pelindung...` (satu slash) → perbaiki menjadi `https://`.
- 4 URL tanpa port 3443 (mis. `https://pelindung.bandung.go.id/video/DISHUB/spcinamboBar.m3u8`) → port 443 menyajikan SPA, bukan stream; tandai sebagai kemungkinan mati atau coba tambahkan port.
- 1 URL `.m3u` (bukan `.m3u8`): `.../DISHUB/samsat.m3u`.
- Nama kamera tidak konsisten (spasi, duplikat "ALUN-ALUN_02").

## 2. Kab. Bandung — dishub.bandungkab.go.id/cctv/

Halaman statis. **TIDAK ADA API** — data kamera hardcode di HTML sebagai array JS `cctvData` (9 kamera):

```js
{ id: 1, name: "SP PEMDA", code: "SP",
  coordinates: [-7.024114, 107.530442],          // [lat, lng]
  streamUrl: "https://cctv.bandungkab.go.id/9f6798a4767c7f3fc05ab6c13e244809/hls/dishub01/kRTdYHeHLZ/s.m3u8?api=pQZlhVa7rDExQw0IxL4E1cGziXfhsU" }
```

Daftar: SP PEMDA, TOL SOROJA, GADING TUTUKA, DESA SOREANG, KOPO SAYATI, RANCAMANYAR, CIPARAY, KATAPANG, MAJALAYA. (Ada blok `cctvData` lama yang dikomentari dengan hash berbeda — abaikan.)

**Stream:** HLS live di `cctv.bandungkab.go.id`, media playlist dengan segmen `sXXXX.ts` relatif. Terverifikasi live. Token `api=` pada query string perlu disertakan.

**CORS:** `access-control-allow-origin: *` → **boleh dimainkan langsung dari browser** tanpa proxy.

**Cara mengambil data:** scrape HTML `https://dishub.bandungkab.go.id/cctv/` (regex/parse array `cctvData`), atau snapshot statis + re-scrape berkala.

## 3. Kota Cimahi — smartcity.cimahikota.go.id/cctv

> **Keputusan (2026-09-03): Cimahi DITUNDA dari MVP.** Sumber tidak terjangkau (Cloudflare) dan tidak ada di agregator pihak ketiga mana pun yang dicek (lihat bagian 5). Script scrape tetap mencobanya best-effort; bila kelak dijalankan dari jaringan Indonesia yang lolos Cloudflare, channel Cimahi otomatis masuk snapshot sebagai `streamType: "embed"` tanpa perlu refactor web. Analisa di bawah dipertahankan sebagai referensi.

Halaman server-render + jQuery. Konfigurasi di inline JS:

```js
const CCTV_BASE_URL = "https://demo-cctv.cimahikota.go.id";
```

**Daftar kamera:** `GET {BASE}/api/v1/channels` → array `[{ name, channel }]`, lalu pemain memakai **iframe** `{BASE}/embed?channel={channel}`. `/cctv/internal` adalah portal login Laravel (NIP + password) — privat, jangan disentuh.

**BLOKIR:** `demo-cctv.cimahikota.go.id` dilindungi Cloudflare WAF yang menolak akses dari luar jaringan/geo yang diizinkan — bahkan di browser nyata halaman resminya menampilkan "Gagal menghubungkan ke server CCTV", dan tidak ada arsip Wayback. Endpoint ini kemungkinan hanya terbuka bagi pengunjung dari Indonesia.

**Strategi:** (a) coba fetch daftar channel dari server secara berkala; jika gagal, (b) render tombol Cimahi sebagai iframe passthrough `https://demo-cctv.cimahikota.go.id/embed?channel=N` yang dimuat langsung di browser pengguna akhir (iframe tidak terkena CORS; jika pengguna dari Indonesia kemungkinan lolos), (c) jika tetap gagal, tampilkan status "sumber tidak tersedia" dan coba lagi berkala. Jangan hardcode daftar channel yang belum diverifikasi.

## 4. Kab. Bandung Barat — atcs.bandungbaratkab.go.id

**Daftar kamera (JSON, tanpa autentikasi, tanpa CORS header → wajib fetch server-side):**

```
GET https://atcs.bandungbaratkab.go.id/get-cctv
```

Respons: `{"status":"success","data":[...]}`, 58 item, skema:

```json
{
  "nama_cctv": "CIBURUY - CIPATAT",
  "alias": "ciburuy_cipatat",
  "koordinat": "-6.833915591335607, 107.46786140543834",   // "lat, lng" (string, perlu di-split)
  "link": "https://atcs-dishubkbb.urbanaccess.net/9512d5e6-2424-44f0-869a-4026ea91b2ed.html"
}
```

Ada juga `GET /set-cctv?id={alias}` untuk satu kamera.

**Stream:** `link` adalah halaman embed **datarhei Restreamer**. Player memuat `channels/{uuid}/config.js` yang berisi `source: "memfs/{uuid}.m3u8"`. Jadi **URL HLS langsung** (terverifikasi live di 2 kamera):

```
https://atcs-dishubkbb.urbanaccess.net/memfs/{uuid}.m3u8
```

di mana `{uuid}` diambil dari `link` (`.../{uuid}.html`). Master playlist menunjuk varian relatif `{uuid}_output_0.m3u8?session=...` (1280x720).

**CORS:** `Access-Control-Allow-Origin: *` pada stream → **boleh dimainkan langsung dari browser** tanpa proxy.

## 5. Sumber alternatif: pantaucctv.com (agregator pihak ketiga)

API publik tanpa autentikasi, CORS `*` (bisa diquery dari browser), total katalog ±5.440 kamera se-Indonesia:

```
GET https://www.pantaucctv.com/api/v1/cameras?page=1&limit=24&search=cimahi
GET .../cameras?city={slug}          # slug: kota-bandung, kabbandung, kota-cimahi, kabupaten-bandung-barat
GET https://www.pantaucctv.com/api/thumbnail?id={camera-id}   # JPEG, siap pakai
```

Skema per kamera: `id, name, city_id, category_id, provider_id, latitude, longitude, stream_type ("hls" | "youtube"), stream_url, embed_url (hampir selalu null), snapshot_url, status, health_rate_7d`.

**Jawaban atas "ada stream url atau embed url?":** ada `stream_url` untuk semua kamera; `embed_url` praktis selalu null. Untuk `stream_type: "youtube"`, `stream_url`-nya sendiri berupa URL embed YouTube (`https://www.youtube.com/embed/...`) yang dimainkan via iframe.

**Temuan penting (diverifikasi 2026-09-03):**
- Stream mereka menunjuk ke server asal (pelindung:3443, atcs-dishubkbb.urbanaccess.net/memfs, *.cctvbadilag.my.id, YouTube) — konsisten dengan temuan kita sendiri; katalog mereka memvalidasi recon kita.
- **Cimahi: tidak ada yang berguna.** `city=kota-cimahi` hanya 1 kamera (Pengadilan Agama) dengan `stream_url` ke `atcs-dishub.jabarprov.go.id` yang domainnya sudah tidak resolve (NXDOMAIN) padahal berstatus "online". Kamera lalu lintas Dishub Cimahi TIDAK ada di katalog mereka.
- `city=kota-bandung` = 404 (didominasi pelindung, cocok dengan 406 kita) + kamera Badilag (pengadilan).
- `city=kabbandung` = 42, tapi 17 di antaranya salah label (sebenarnya kamera KBB di host urbanaccess) dan 9 kamera Dishub Kab. Bandung milik `cctv.bandungkab.go.id` TIDAK ada di katalog mereka.
- `city=kabupaten-bandung-barat` = 60 (memfs urbanaccess, sama dengan temuan kita).
- Kualitas data mereka: slug kota tidak konsisten (`bandung` vs `kota-bandung`), salah label kota, health/status bisa basi.

**Kesimpulan:** jangan dijadikan sumber utama — katalog kita lebih akurat untuk 3 sumber resmi, dan bergantung pada pantaucctv berarti bergantung pada uptime & kebijakan pihak ketiga. Kegunaan nyata: (a) validasi silang saat regenerasi snapshot, (b) endpoint thumbnail `/api/thumbnail?id=` bila ingin gambar pratinjau kamera tanpa memutar stream, (c) sumber kamera tambahan opsional (Badilag/pengadilan, YouTube) bila suatu saat diinginkan.

## Matriks Integrasi

| Sumber | Daftar kamera | Jml | Tipe pemutaran | Butuh proxy? |
|---|---|---|---|---|
| Kota Bandung | `GET pelindung.bandung.go.id:8443/api/cek` | 406 | HLS (port 3443) | **Ya** — daftar & stream (CORS terkunci) |
| Kab. Bandung | scrape HTML `cctvData` di `dishub.bandungkab.go.id/cctv/` | 9 | HLS (CORS `*`) | Tidak (stream); scrape daftar via server |
| Cimahi | `GET demo-cctv.cimahikota.go.id/api/v1/channels` (diblokir CF) | ? | iframe `/embed?channel=N` | Tidak (iframe); daftar best-effort |
| Kab. Bandung Barat | `GET atcs.bandungbaratkab.go.id/get-cctv` | 58 | HLS `memfs/{uuid}.m3u8` (CORS `*`) | Tidak (stream); daftar via server |

## Aturan Normalisasi (WAJIB di pipeline agregator)

1. Perbaiki typo `https:/` → `https://` pada `stream_cctv` Bandung.
2. URL Bandung tanpa port → tambahkan `:3443`; jika tetap gagal saat health-check, tandai `offline`.
3. KBB: parse `koordinat` string → `lat, lng` (urutan sudah benar: koma pertama = lat).
4. Kab. Bandung: `coordinates` = `[lat, lng]`.
5. Cimahi: hanya tampilkan channel yang berhasil diverifikasi; sisipkan `?channel=` apa adanya.
6. Seragamkan ke skema internal (lihat PRD): `id, source, name, dinas, lat, lng, streamType ('hls'|'embed'), streamUrl, embedUrl, area`.
7. Health-check per kamera: HEAD/GET manifest m3u8 dengan timeout pendek (3–5 s), hasil disimpan sebagai status `online/offline`; jangan blokir render menunggu semua.

## Catatan Etika & Risiko

- Semua data di atas adalah layanan publik pemerintah tanpa autentikasi; gunakan dengan cantumkan atribusi + tautan ke situs sumber.
- Jangan menyalin `api=` token Kab. Bandung ke tempat lain selain query string aslinya.
- Endpoint upstream bisa berubah tanpa pemberitahuan — desain harus mendegradasi per-sumber (satu sumber mati tidak boleh mematikan web).
- Rate-limit proxy stream Bandung agar tidak menjadi beban bagi server pemkot.
