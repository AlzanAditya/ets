1. **BREADCRUMB** :
	1. Sekarang Breadcrumb (src/components/site-header.tsx) bisa memiliki sub Breadcrumb (Misal "products > NamaPelanggan"), dan sub ini akan terpicu antara user mengklik data pada table Products dan client (kecuali mengklik bagian tags seperti yang di jelaskan di nomor ??????) atau masuk bagian "add products" (products > add) dan "add transaction" (transaction). interaksi yang menambahkan sub BreadCrumb akan masuk ke halaman baru sesuai dengan konteks yang sudah di jelaskan. untuk style subbreadcrumbnya sendiri lebih tipis dan lebih pudar
	2. dan buat sub-breadcrumb-nya nya memiliki 2 kondisi, yaitu:
		1. jika melihat halaman dari data table products (products > NamaProduk) dan table client (clients > NamaKlien) maka di bawah teks subbreadcrumbnya ada variable lain, yaitu client_id dan product_id (pastikan untuk teks ini seperti disatukan dengan teks subbreadcrumb lalu di center)
		2. selain dari 2 kondisi di poin pertama, maka tampilkan subbreadcrumb sebagaimana jadinya (seperti di jelaskan di bagian style sebelumnya)


2. **HALAMAN**
	akan ada perombakan pada bagain <PageContent> untuk setiap halaman. Jadi, tidak perlu lagi menggunakan header, title, dan deskripsi singkatnya. Namun, akan digantikan dengan beberapa elemen lain yang akan dibuat. (jadi karena itu modifikasi semua halaman yang memiliki <PageContent>) Semisal, 
	1. **Halaman Products**: 
	2. **Halaman Clients**: 
	3. **Halaman Dashboard**:
	4. **Sub Halaman Products & Client**: hapus elemen yang muncul dari samping kanan layar digantikan dengan halaman baru. Jadi untuk halaman produk ketika item produk itu di klik maka akan muncul halaman baru namun dia memiliki breadcrumb produk tanda panah ke kanan lalu digunakan ID atau nomor seri dari produk tersebut dan ketika ditampilkan maka akan memunculkan kolom-kolom atau data yang perlu diisi seperti pada elemen sebelumnya.
	0. **Halaman Images**

3. **TABLE**
	1. **Interaktif Tags Table**: sekarang user bisa langsung mengubah tags pada table tanpa harus "masuk" ke dalam salah satu data table tersebut untuk mengubah tags saja. pastikan semua tags. karena itu tambahkan juga fungsi khusus untuk tags agar bisa seperti ini namun untuk fungsinya tetap berada di file yang sama yang mengatur tabelnya juga
	2. **Width Number Colomn**: persempit lebar dari kolom nomor urut agar sama dengan lebar kolom checkbox
	3. 

4. **UPDATE COMPONENTS**:
	1. **Redesign Card**: sekarang untuk card <Card??> memiliki variable warna yang mengatur warna pada card beserta teks nya, 
	2. **Pemindahan Profile Component**: akan ada 2 perbedaan untuk tampilan mobile dan desktop terkait pemindahan component ini. namun umumnya Icon profile yang awalnya 

5. **Sync**:
	1. **Theme**: antara pengaturan theme di menu setting dan di menu sub setting itu tidak sesuai
	2. **Device-to-device syncronitation**: Optimalkan sinkronisasi agar lebih mirip seperti website BME (apps/bme). jadi ketika ada data terhapus, maka di sudut pandang user lain data tersebut pula terhapus tanpa perlu refresh web. 
	3. **TOLONG ISIKAN OLEH MU CHATGPT**: Ketika membuka bagian add/edit pada data product, di bagian paling bawah itu ada kumpulan image, terkadang image tersebut gagal muncul karena kemungkinan tidak memberikan batas toleransi waktu atau memang tidak di program untuk "Await"  

1. hapus elemen yang muncul dari samping kanan ke kanan layar digantikan dengan halaman baru. Jadi untuk halaman produk ketika item produk itu di klik maka akan muncul halaman baru namun dia memiliki breadcrumb produk tanda panah ke kanan lalu digunakan ID atau nomor seri dari produk tersebut dan ketika ditampilkan maka akan memunculkan kolom-kolom atau data yang perlu diisi seperti pada elemen sebelumnya.

3. untuk image yang ditampilkan di halaman image dibuat agar image yang tampil itu dikelompokkan berdasarkan item maupun statusnya. Semisal jika suatu data memiliki variabel atau status sedang di servis grup/card