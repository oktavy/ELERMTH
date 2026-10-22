# ElearnMath (Supabase + GitHub Pages)

Web e-learning matematika berbasis React. Data disimpan di **Supabase** (database online) dan situs di-*deploy* gratis lewat **GitHub Pages**.

## Isi proyek
```
index.html            halaman utama
style.css, app.js     tampilan & aplikasi (hasil pecahan dari file single-HTML)
config.js             URL + anon key Supabase (ISI INI)
supabase-sync.js      lapisan sinkron localStorage <-> Supabase
supabase/schema.sql   skrip tabel database (jalankan di Supabase)
.github/workflows/deploy.yml   otomatis deploy ke GitHub Pages
```

## Langkah 1 – Buat database di Supabase
1. Daftar/login di https://supabase.com → **New project**. Isi nama (mis. `elearnmath`), buat password database, pilih region terdekat (mis. Singapore) → **Create**. Tunggu ±2 menit.
2. Menu **SQL Editor** → **New query** → salin seluruh isi `supabase/schema.sql` → **Run**. Harus muncul "Success".
3. Menu **Table Editor**: pastikan tabel `app_state` ada.
4. Menu **Project Settings → API**. Catat:
   - **Project URL** (mis. `https://abcd1234.supabase.co`)
   - **anon / publishable key** (kunci publik). **Jangan** pakai `service_role`.

## Langkah 2 – Isi konfigurasi
Buka `config.js`, ganti `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dengan nilai tadi. Simpan.
(Alternatif tanpa edit file: lihat "Opsi Secrets" di bawah.)

## Langkah 3 – Coba di komputer (opsional)
Karena aplikasi memuat file lain, jalankan lewat server lokal, jangan klik dua kali `index.html`:
```
python -m http.server 8000
```
lalu buka http://localhost:8000. Daftar/ubah data, lalu cek tabel `app_state` di Supabase: barisnya akan terisi.

## Langkah 4 – Upload ke GitHub
1. Buat akun di https://github.com → **New repository** (mis. `elearnmath`), **Public**, tanpa README → **Create**.
2. Cara paling mudah (tanpa git): di halaman repo klik **uploading an existing file**, seret **semua isi folder proyek ini** (termasuk folder `.github` dan `supabase`) → **Commit changes**.
   Cara git:
   ```
   git init
   git add .
   git commit -m "ElearnMath awal"
   git branch -M main
   git remote add origin https://github.com/USERNAME/elearnmath.git
   git push -u origin main
   ```
   > Folder `.github` bersifat tersembunyi; pastikan ikut terunggah (cek di repo ada `.github/workflows/deploy.yml`).

## Langkah 5 – Aktifkan GitHub Pages
1. Di repo: **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Buka tab **Actions**; workflow "Deploy ke GitHub Pages" berjalan (±1 menit). Bila gagal/belum jalan, klik **Run workflow**.
4. Setelah hijau, alamat situs: `https://USERNAME.github.io/elearnmath/`.

Setiap kali Anda mengubah file dan push/commit ke `main`, situs otomatis diperbarui.

## Opsi Secrets (config.js tidak perlu diedit)
Repo → **Settings → Secrets and variables → Actions → New repository secret**, buat `SUPABASE_URL` dan `SUPABASE_ANON_KEY`. Workflow otomatis membuat `config.js` dari keduanya saat deploy.

## Cara kerja sinkron
- Aplikasi tetap memakai localStorage; `supabase-sync.js` memuat data dari Supabase sebelum aplikasi mulai, mengirim perubahan (per bagian data: users, classes, submissions, …) ke tabel `app_state`, dan mengecek data baru dari pengguna lain tiap ±8 detik.
- Jika Supabase belum diisi/tidak terjangkau, aplikasi berjalan lokal seperti biasa.
- Jika dua orang mengubah **bagian data yang sama** bersamaan, yang terakhir menyimpan yang menang.
- Data login (sesi) tetap di browser masing-masing.

## Keamanan (penting)
1. **API key Gemini**: di file asli ada kunci Gemini yang tertanam. Di proyek ini sudah **dihapus** dari `app.js`. Anggap kunci itu sudah bocor: **buat ulang/cabut** di Google AI Studio. Isi kunci baru lewat pengaturan di dalam aplikasi — ingat, pengaturan itu ikut tersimpan di tabel `app_state`, sehingga bisa terbaca siapa pun yang punya anon key. Untuk penggunaan serius, jangan simpan kunci di sana (pakai Supabase Edge Function).
2. **Anon key publik + RLS terbuka**: kebijakan di `schema.sql` mengizinkan siapa pun yang tahu URL + anon key membaca dan menulis `app_state`, termasuk **password pengguna yang tersimpan polos** oleh aplikasi. Ini cukup untuk prototipe/tugas kuliah, tetapi jangan dipakai untuk data siswa sungguhan. Perbaikan lanjutan: Supabase Auth, password ter-hash, dan RLS per pengguna.
3. Jangan pernah menaruh `service_role` key di repo.
