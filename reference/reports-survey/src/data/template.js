export const ASSET='/report-assets/';
export const initialReport={
 reportType:'survey',
 clientName:'PT USAHA ADI SANGGORO (ASNET)',
 clientLogo:`${ASSET}s01-p02.png`,
 address:'Jalan Doktor Sumeru No. 23 E Kebon Kelapa, RT.02/RW.01, Menteng, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16111',
 surveyDate:'29 Juli 2026', surveyLocation:'BOGOR',
 coverTitle:'LAPORAN SURVEI DAN SOLUSI KELISTRIKAN',
 coverSubtitle:'UNTUK MEMPROTEKSI PERANGKAT DATA CENTER',
 findings:['Tidak terdapat alat proteksi terhadap Tegangan Ekstrim (Over Voltage) & Tegangan Kejut (Surge).','Hasil Grounding elektrikal terukur ideal (0,3 Volt).','Potensi Noise yang tinggi pada jalur kelistrikan perangkat.','Berada di wilayah yang berpotensi petir tinggi.'],
 requiredSolution:['Diperlukan sebuah sistem Proteksi dari Problem Kelistrikan (Over Voltage & Surge Voltage) yang menyeluruh untuk jalur phase - neutral- grounding yang bekerja secara aktif.','Diperlukan solusi antisipasi untuk grounding yang berpotensi berubah-ubah.','Akibat dari kondisi di atas, perlu disiapkan sistem proteksi terhadap gangguan kelistrikan guna meminimalisir kerusakan perangkat yang terganggu.','Oleh karena itu kami menawarkan solusi sistem proteksi dan improvement kelistrikan.'],
 explanation:'Secara fungsi, sistem proteksi pada ETS akan terlihat seperti berikut ini.',
 products:[
  {name:'UPS EATON (60 KVA)',brand:'EATON',device:'UPS',capacity:'60 KVA',phaseR:'48,9 A',phaseS:'49,9 A',phaseT:'47,9 A',voltage:'228–229 V',grounding:'0,3 V',ups:'60 KVA',stabilizer:'-',powerProtection:'Tidak Ada',communicationProtection:'Tidak Ada',load:'Perangkat Panel UPS A',note:'Tidak ada proteksi terhadap over voltage & surge voltage.',photos:['s03-p01.jpg','s03-p02.jpg','s03-p03.jpg','s03-p04.jpg','s03-p05.jpg','s03-p06.jpg'],measurementPhotos:['s04-p01.jpg','s04-p03.jpg','s04-p02.jpg'],solutionTitle:'1. UPS EATON (60 KVA)',ets:'ETS 60 KVA (Three Phase)',covered:'Perangkat Yang tercover UPS 60 KVA'},
  {name:'UPS EATON (120 KVA)',brand:'EATON',device:'UPS',capacity:'120 KVA',phaseR:'83,8 A',phaseS:'114,1 A',phaseT:'104,9 A',voltage:'228–229 V',grounding:'0,3 V',ups:'120 KVA',stabilizer:'-',powerProtection:'Tidak Ada',communicationProtection:'Tidak Ada',load:'Perangkat Panel UPS B',note:'Tidak ada proteksi terhadap over voltage & surge voltage.',photos:['s05-p01.jpg','s05-p02.jpg','s05-p03.jpg','s05-p04.jpg'],measurementPhotos:['s06-p03.jpg','s06-p02.jpg','s06-p01.jpg','s06-p04.jpg'],solutionTitle:'2. UPS EATON (120 KVA)',ets:'ETS 120 KVA (Three Phase)',covered:'Perangkat Yang tercover UPS 120 KVA'}
 ]
};
