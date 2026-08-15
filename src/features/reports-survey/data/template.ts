import { ReportData } from '../types'

export const ASSET = '/report-assets/'

export const initialReport: ReportData = {
  reportType: 'survey',
  clientName: 'PT USAHA ADI SANGGORO (ASNET)',
  clientLogo: `${ASSET}s01-p02.png`,
  address: 'Jalan Doktor Sumeru No. 23 E Kebon Kelapa, RT.02/RW.01, Menteng, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16111',
  surveyDate: '29 Juli 2026',
  surveyLocation: 'BOGOR',
  coverTitle: 'LAPORAN SURVEI DAN SOLUSI KELISTRIKAN',
  coverSubtitle: 'UNTUK MEMPROTEKSI PERANGKAT DATA CENTER',
  findings: [
    'Tidak terdapat alat proteksi terhadap Tegangan Ekstrim (Over Voltage) & Tegangan Kejut (Surge)\nDari hasil survei kondisi existing pada perangkat IT belum memiliki sistem proteksi terhadap Tegangan Ekstrim (Over Voltage) dan Tegangan Kejut (Surge Voltage). Sehingga jika terjadi serangan dari Over Voltage & Surge Voltage berpotensi akan menyebabkan kerusakan pada perangkat server & network switch.',
    'Hasil Grounding elektrikal terukur ideal (Ideal <1 Volt)\nDari hasil pengukuran Grounding di PT Usaha Adi Sanggoro hasilnya yaitu di bawah 1 Volt. Pada saat musim kemarau nilai Ground berpotensi menjadi lebih tinggi. Hal ini bisa mengganggu kinerja perangkat Server dan juga berpotensi terkena sengatan listrik bagi orang yang menyentuh perangkat server jika tidak menggunakan APD akibat kebocoran listrik yang tidak disalurkan ke Ground dengan baik.',
    'Potensi Noise\nApabila terdapat perangkat elektronik yang menggunakan dynamo seperti Pompa Air, Motor Produksi, AC maupun perangkat lain yang menggunakan dynamo atau motor. Hal ini berpotensi menghasilkan Noise / Induksi sehingga bisa mengganggu kinerja perangkat IT.',
    'Berada di wilayah yang berpotensi petir tinggi\nLokasi Gedung berada di wilayah yang intensitas petirnya tinggi. Berpotensi mengenai penangkal petir gedung & penghantar listrik di sekitar gedung sehingga berimbas ke perangkat server terkena dampak petir seperti Over Voltage maupun Surge Voltage yang dapat merusak perangkat Monitoring (Server & Switch).'
  ],
  requiredSolution: [
    'Diperlukan sebuah sistem Proteksi dari Problem Kelistrikan (Over Voltage & Surge Voltage) yang menyeluruh untuk jalur phase - neutral- grounding yang bekerja secara aktif.',
    'Diperlukan solusi antisipasi untuk grounding yang berpotensi berubah-ubah.',
    'Akibat dari kondisi di atas, perlu disiapkan sistem proteksi terhadap gangguan kelistrikan guna meminimalisir kerusakan terganggunya kinerja perangkat serta usia pakai yang rendah bahkan efek paling parah bisa timbul terjadinya kebakaran.',
    'Oleh karena itu untuk mengatasi permasalahan di atas, kami menawarkan solusi sistem proteksi dan improvement kelistrikan menggunakan : ETS (Electricity Treatment System).'
  ],
  explanation: 'Secara fungsi, sistem proteksi pada ETS akan terlihat seperti berikut ini.',
  products: [
    {
      name: 'UPS EATON (60 KVA)',
      brand: 'EATON',
      device: 'UPS',
      capacity: '60 KVA',
      phaseR: '48,9 A',
      phaseS: '49,9 A',
      phaseT: '47,9 A',
      voltage: '228–229 V',
      grounding: '0,3 V',
      ups: '60 KVA',
      stabilizer: '-',
      powerProtection: 'Tidak Ada',
      communicationProtection: 'Tidak Ada',
      load: 'Perangkat Panel UPS A',
      note: 'Tidak ada proteksi terhadap over voltage & surge voltage.',
      photos: ['s03-p01.jpg', 's03-p02.jpg', 's03-p03.jpg', 's03-p04.jpg', 's03-p05.jpg', 's03-p06.jpg'],
      measurementPhotos: ['s04-p01.jpg', 's04-p03.jpg', 's04-p02.jpg'],
      solutionTitle: '1. UPS EATON (60 KVA)',
      ets: 'ETS 60 KVA (Three Phase)',
      covered: 'Perangkat Yang tercover UPS 60 KVA'
    },
    {
      name: 'UPS EATON (120 KVA)',
      brand: 'EATON',
      device: 'UPS',
      capacity: '120 KVA',
      phaseR: '83,8 A',
      phaseS: '114,1 A',
      phaseT: '104,9 A',
      voltage: '228–229 V',
      grounding: '0,3 V',
      ups: '120 KVA',
      stabilizer: '-',
      powerProtection: 'Tidak Ada',
      communicationProtection: 'Tidak Ada',
      load: 'Perangkat Panel UPS B',
      note: 'Tidak ada proteksi terhadap over voltage & surge voltage.',
      photos: ['s05-p01.jpg', 's05-p02.jpg', 's05-p03.jpg', 's05-p04.jpg'],
      measurementPhotos: ['s06-p03.jpg', 's06-p02.jpg', 's06-p01.jpg', 's06-p04.jpg'],
      solutionTitle: '2. UPS EATON (120 KVA)',
      ets: 'ETS 120 KVA (Three Phase)',
      covered: 'Perangkat Yang tercover UPS 120 KVA',
      photoLayoutMode: '1row',
      phaseDisplayMode: 'unified'
    }
  ]
}
