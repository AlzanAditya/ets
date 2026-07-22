# Product Requirement Document (PRD) & Implementation Plan
## Proyek: ETS (Enterprise Tracking System) Dashboard Refactoring

Dokumen ini disusun berdasarkan kebutuhan peningkatan fungsionalitas dan estetika pada aplikasi ETS Dashboard. Untuk memastikan kualitas kode yang tinggi dan meminimalkan risiko regresi, implementasi dibagi menjadi **3 Fase terstruktur**.


---

## FASE 1: Navigasi, Breadcrumb Dinamis & Desain Halaman Baru (Routing & Layout)
Fokus utama fase ini adalah merombak alur navigasi dari model Drawer/Sheet samping ke model Sub-Halaman penuh (Full-Page routing), serta menyempurnakan struktur header global.

### 1. Perombakan Breadcrumb (`src/components/site-header.tsx`)
*   **Fungsionalitas**: Breadcrumb akan mendukung visualisasi hierarki bertingkat (sub-breadcrumb), misalnya: `Products > Nama Produk` atau `Clients > Nama Klien`.
*   **Trigger Kondisi**:
    *   Mengklik baris data pada tabel Products atau Clients (kecuali kolom interaktif seperti *Tags*) akan mengarahkan pengguna ke sub-halaman detail baru.
    *   Mengakses aksi tambah data akan memicu breadcrumb `Products > Add` atau `Transactions > Add`.
*   **Aesthetic & Desain**:
    *   Sub-breadcrumb akan menggunakan gaya visual yang lebih tipis dan pudar (`font-light text-muted-foreground/60`).
    *   **Kondisi Khusus Detail**: Jika berada di halaman detail produk (`products > NamaProduk`) atau detail klien (`clients > NamaKlien`), di bagian bawah teks sub-breadcrumb akan ditampilkan ID pengenal (`product_id` atau `client_id`). ID ini disatukan dalam satu grup pemformatan dan dibuat rata tengah (*center*) di bawah breadcrumb utama untuk menjaga simetri visual.
    *   **Kondisi Standar**: Selain halaman detail tersebut (seperti halaman *Add*), sub-breadcrumb akan ditampilkan normal tanpa menampilkan ID di bawahnya.

### 2. Perombakan Komponen `<PageContent>` (`src/components/page-content.tsx`)
*   **Fungsionalitas**: Menghapus elemen bawaan seperti header, judul statis, dan deskripsi singkat dari pembungkus `<PageContent>`. 
*   **Alasan**: Memindahkan kendali identitas halaman sepenuhnya ke `SiteHeader` (menggunakan Breadcrumb dinamis) agar menghemat ruang vertikal layar dan memberikan tampilan minimalis modern.
*   **Dampak**: Memodifikasi seluruh halaman modul yang menggunakan `<PageContent>` (`DashboardPage`, `ProductsPage`, `ClientPage`, `TransactionPage`, dll.) untuk menyesuaikan dengan struktur tanpa header internal ini.

### 3. Sub-Halaman Pengganti Drawer Samping (Detail & Form)
*   **Fungsionalitas**: Menghapus component samping (`TableDrawer` / sheet kanan) untuk operasi tambah/edit data Products dan Clients.
*   **Solusi**: Menggantikannya dengan alur sub-halaman penuh (Dedicated Sub-page) yang memanfaatkan `react-router-dom` v7. Form input, manajemen tab, dan galeri gambar akan ditampilkan secara elegan dengan ruang yang lebih luas.

---

## FASE 2: Interaktivitas Tabel, Desain Komponen & Optimasi Media (UI & UX)
Fokus fase ini adalah memperkaya interaksi mikro pada tabel, memperindah komponen kartu (*Card*), dan memperbaiki kinerja pemuatan gambar.

### 1. Kolom Tags Interaktif pada Tabel
*   **Fungsionalitas**: User dapat langsung mengubah, menambah, atau menghapus tags secara inline langsung di baris tabel tanpa harus membuka halaman detail produk/klien terlebih dahulu.
*   **Teknis**: Menambahkan kontrol dropdown select multi-opsi atau popover mini langsung di dalam renderer kolom `tags` pada komponen tabel bersangkutan.

### 2. Penyempitan Lebar Kolom Nomor Urut
*   **Fungsionalitas**: Mengatur lebar (*width*) kolom nomor urut `#` agar memiliki lebar minimal yang presisi, setara dengan lebar kolom checkbox pilihan di sebelah kirinya. Hal ini akan mencegah pemborosan ruang horizontal pada tabel padat data.

### 3. Redesain Komponen Kartu (`Card`)
*   **Fungsionalitas**: Menambahkan variabel warna dinamis (*color property*) pada komponen `<Card>` pembungkus metrik atau informasi. Variabel ini akan mengatur warna latar belakang (*background*), garis tepi (*border*), dan teks secara harmoni berdasarkan tipe status (misal: sukses, bahaya, peringatan, info).

### 4. Pemindahan Posisi Komponen Profil Pengguna
*   **Fungsionalitas**: Memindahkan posisi tampilan profil user (`nav-user`):
    *   **Desktop**: Dipindahkan ke posisi terintegrasi yang lebih natural di sudut kanan atas atau menyatu dengan site header.
    *   **Mobile**: Tetap mempertahankan penempatan yang ergonomis pada menu mobile drawer bawah agar mudah dijangkau oleh ibu jari.

### 5. Pengelompokan Halaman Gambar (`src/pages/images/index.tsx`)
*   **Fungsionalitas**: Menyusun ulang tata letak gambar pada halaman Images agar dikelompokkan secara visual menggunakan grid/card berdasarkan kategori item atau status operasional produk (misalnya: grup produk dengan status "Sedang Diservis/Maintenance").

### 6. Perbaikan Asinkronus Pemuatan Gambar Produk (Bug Fix)
*   **Masalah**: Kumpulan gambar di bagian bawah form produk terkadang gagal muncul karena tidak adanya toleransi waktu tunggu (*timeout*) atau hilangnya operasi `await` saat memuat URL gambar dari storage.
*   **Solusi**: Memperbaiki alur asinkronus pemuatan gambar menggunakan Promise-handling yang tangguh, mengimplementasikan indikator pemuatan (*skeleton loading state*), dan mengoptimalkan fungsi `image-service.ts` dengan toleransi retries.

---

## FASE 3: Sinkronisasi Real-Time & Integrasi Tema (System & Sync)
Fokus pada keandalan sinkronisasi data antar-perangkat dan sinkronisasi preferensi tema sistem.

### 1. Sinkronisasi Tema Pengaturan (Theme Sync)
*   **Masalah**: Terjadi ketidaksesuaian nilai tema (Dark/Light/System) antara menu pengaturan utama dengan sub-pengaturan di sistem.
*   **Solusi**: Menyatukan *state management* tema menggunakan satu provider terpusat (mengintegrasikan `next-themes` secara konsisten pada kedua menu kontrol).

### 2. Optimasi Sinkronisasi Real-Time Multi-Device (Device-to-Device Sync)
*   **Fungsionalitas**: Meningkatkan integrasi Supabase Realtime agar perubahan data (khususnya penghapusan/delete) langsung terfleksi secara instan di layar pengguna lain tanpa perlu melakukan refresh halaman manual dan tanpa merusak status scroll atau performa tabel aktif.

---

## RENCANA KERJA & FILE YANG AKAN TERDAMPAK

Berikut adalah daftar file utama yang akan dimodifikasi selama pengerjaan:
1.  **Fase 1**:
    *   `src/App.tsx` (Penambahan rute navigasi baru untuk sub-halaman detail/add)
    *   `src/components/site-header.tsx` (Peningkatan struktur breadcrumb dinamis)
    *   `src/components/page-content.tsx` (Perampingan frame konten halaman)
    *   `src/pages/products/index.tsx` & `src/pages/client/index.tsx` (Pemisahan drawer menjadi sub-halaman)
2.  **Fase 2**:
    *   `src/components/data-table.tsx` (Penyempitan lebar kolom nomor)
    *   `src/components/ui/card.tsx` (Penambahan properti warna dinamis)
    *   `src/pages/images/index.tsx` (Pengelompokan gambar berdasarkan status/item)
    *   `src/lib/image-service.ts` & `src/components/table-drawer.tsx` (Perbaikan asinkronus gambar)
3.  **Fase 3**:
    *   `src/pages/settings/index.tsx` (Sinkronisasi sistem tema)
    *   `src/hooks/use-realtime-sync.ts` (Optimasi event penghapusan data realtime)

---

### Manfaat Rencana Ini:
*   **Stabilitas Tinggi**: Memisahkan perubahan struktural (Fase 1) dari perubahan visual (Fase 2) dan fungsionalitas sistem (Fase 3).
*   **User Experience Unggul**: Navigasi halaman penuh terasa jauh lebih profesional dibandingkan modal drawer yang sempit pada perangkat tablet atau laptop kecil.
*   **Anti Over-Engineering**: Kita fokus memperbaiki bagian yang memang diperlukan dan mengoptimalkan kode yang sudah ada tanpa melakukan pengerjaan ulang yang tidak efisien.

### Risiko & Mitigasi:
*   *Risiko*: Perubahan navigasi penuh dapat mempengaruhi performa rendering awal jika data detail terlalu besar.
    *   *Mitigasi*: Memanfaatkan `@tanstack/react-query` untuk caching data detail yang sudah diambil sebelumnya dari daftar tabel utama.
