# cctv

Agregator CCTV publik Bandung Raya dalam satu web. MVP mencakup **3 wilayah: Kota Bandung, Kab. Bandung, Kab. Bandung Barat** (473 kamera); Cimahi ditunda karena sumber datanya tidak terjangkau (lihat `docs/data-sources.md` bagian 3).

- [docs/data-sources.md](docs/data-sources.md) — hasil rekayasa balik endpoint & stream 4 sumber data (terverifikasi) + analisa sumber alternatif.
- [docs/PRD.md](docs/PRD.md) — product requirements (scope, arsitektur, risiko, metrik sukses).
- [docs/TODO.md](docs/TODO.md) — rencana pengerjaan bertahap untuk implementator AI.
- [data/cameras.json](data/cameras.json) — snapshot statis 473 kamera (scrape sekali di awal; tanpa fetch saat runtime).
- [scripts/scrape.mjs](scripts/scrape.mjs) — generator snapshot (`node scripts/scrape.mjs`, tanpa dependensi; jalankan manual bila sumber berubah — Cimahi otomatis masuk bila suatu saat dijalankan dari jaringan yang lolos Cloudflare).

## Menjalankan

```bash
npm install
npm run dev        # Vite dev server + middleware proxy /p/ (default :5173)
npm run build      # tsc + vite build → dist/
npm run serve      # server produksi zero-dep: dist/ + proxy /p/ (default :3000)
```

Data kamera adalah snapshot statis (`data/cameras.json`) — aplikasi tidak melakukan fetch metadata upstream saat runtime. Stream Bandung diputar lewat proxy `/p/` (CORS upstream terkunci); stream Kab. Bandung dan Kab. Bandung Barat diputar langsung dari browser.

