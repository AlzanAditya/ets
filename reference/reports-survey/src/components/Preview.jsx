import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const A = '/report-assets/';
const BG1 = `${A}bg-01.png`;
const BG2 = `${A}bg-02.png`;

// The reference deck is 1600 × 900. Keep all report coordinates in that
// coordinate system so browser scaling never changes the document geometry.
const X = (n) => `${(n / 1600) * 100}%`;
const Y = (n) => `${(n / 900) * 100}%`;

function Page({ number, total, children, cover = false, className = '', locked = false, onVisible, onOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisible) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onVisible(number);
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [number, onVisible]);

  return (
    <article ref={ref} data-page={number} className={`report-page ${className}${onOpen ? ' report-page-clickable' : ''}`} onClick={onOpen ? () => onOpen(ref.current) : undefined}>
      <img className="report-bg" src={cover ? BG1 : BG2} alt="" />
      {children}
      <span className="page-indicator pdf-ui-only">Halaman {number} / {total}</span>
      {locked && <span className="template-badge pdf-ui-only">TEMPLATE</span>}
    </article>
  );
}

function Text({ x, y, w, h, children, className = '', style = {} }) {
  return (
    <div
      className={`report-text ${className}`}
      style={{ left: X(x), top: Y(y), width: X(w), minHeight: Y(h), ...style }}
    >{children}</div>
  );
}

function Image({ src, x, y, w, h, className = '' }) {
  if (!src) return null;
  const resolved = /^(?:data:|blob:|https?:|\/)/.test(src) ? src : A + src;
  return <img className={`report-image ${className}`} src={resolved} alt="" style={{ left: X(x), top: Y(y), width: X(w), height: Y(h) }} />;
}

function Box({ x, y, w, h, className = '', children }) {
  return <div className={`report-box ${className}`} style={{ left: X(x), top: Y(y), width: X(w), height: Y(h) }}>{children}</div>;
}

const productPageASlots = [
  { x: 402.3, y: 107.3, w: 273.5, h: 364.7 },
  { x: 742.2, y: 107.3, w: 273.5, h: 364.7 },
  { x: 1065.5, y: 107.3, w: 273.5, h: 364.7 },
  { x: 740.8, y: 484.2, w: 273.5, h: 364.7 },
  { x: 402.3, y: 484.2, w: 273.5, h: 364.7 },
  { x: 1062.6, y: 484.2, w: 273.5, h: 364.7 },
];

const productPageBSlots = [
  { x: 257.6, y: 170.9, w: 331.6, h: 442.1 },
  { x: 644.1, y: 172.0, w: 331.6, h: 442.1 },
  { x: 1030.6, y: 171.3, w: 331.6, h: 442.1 },
];

const productPageBSlots4 = [
  { x: 137.5, y: 192.1, w: 317.6, h: 423.5 },
  { x: 491.2, y: 192.1, w: 317.6, h: 423.5 },
  { x: 845.0, y: 192.1, w: 317.6, h: 423.5 },
  { x: 1198.7, y: 192.1, w: 317.6, h: 423.5 },
];

function PhotoGrid({ photos = [], slots, labels = [] }) {
  return <>
    {photos.slice(0, slots.length).map((src, i) => {
      const slot = slots[i];
      const label = labels[i];
      return (
        <React.Fragment key={`${src}-${i}`}>
          <Image src={src} {...slot} className="portrait-photo" />
          {label && (
            <Box
              x={slot.x + slot.w - 164}
              y={slot.y + slot.h - 38}
              w={164}
              h={34}
              className="photo-label"
            >
              {label}
            </Box>
          )}
        </React.Fragment>
      );
    })}
  </>;
}

function ProductPageA({ p, number, total, onVisible, onOpen }) {
  return (
    <Page number={number} total={total} onVisible={onVisible} onOpen={onOpen}>
      <Text x={8} y={97} w={330} h={48} className="product-heading">{p.name}</Text>
      <PhotoGrid
        photos={p.photos}
        slots={productPageASlots}
        labels={['', '', '', '', '', '']}
      />
      <div className="phase-readings">
        <Text x={513.4} y={812.5} w={162.5} h={36.4} className="phase-reading">PHASE R : {p.phaseR}</Text>
        <Text x={853.3} y={812.5} w={162.5} h={36.4} className="phase-reading">PHASE S : {p.phaseS}</Text>
        <Text x={1176.6} y={812.5} w={162.5} h={36.4} className="phase-reading">PHASE T : {p.phaseT}</Text>
      </div>
    </Page>
  );
}

function SurveyTable({ p }) {
  const rows = [
    ['1. TEGANGAN', '( Ideal  220 V ± 3 % )', p.voltage],
    ['2. GROUNDING', '( ideal  <  1 Volt  )', p.grounding],
    ['3. UPS', '', p.ups],
    ['4. STABILIZER', '', p.stabilizer],
    ['5. PROTEKSI EXISTING', 'Power  :  ' + p.powerProtection + '  ,  Line Komunikasi  :  ' + p.communicationProtection, ''],
    ['6. LINE KOMUNIKASI/DATA', '', '-'],
    ['7. BEBAN', '', p.load],
    ['8. CATATAN', '', p.note],
  ];
  return (
    <div className="survey-table">
      <div className="survey-table-title">HASIL SURVEY &amp; PENGUKURAN</div>
      {rows.map(([a, mid, b]) => (
        <div className="survey-row" key={a}>
          <div className="survey-label">{a}</div>
          <div className="survey-mid">{mid}</div>
          <div className="survey-value">{b}</div>
        </div>
      ))}
    </div>
  );
}

function ProductPageB({ p, number, total, onVisible, onOpen }) {
  const four = p.measurementPhotos.length > 3;
  const slots = four ? productPageBSlots4 : productPageBSlots;
  const labels = four ? ['PHASE R - N', 'PHASE S - N', 'PHASE T - N', 'PHASE N - G'] : ['PHASE R - N', 'PHASE S - N', 'PHASE T - N'];
  return (
    <Page number={number} total={total} onVisible={onVisible} onOpen={onOpen}>
      <Text x={22} y={97} w={330} h={48} className="product-heading">{p.name}</Text>
      <PhotoGrid photos={p.measurementPhotos} slots={slots} labels={labels} />
      <SurveyTable p={p} />
    </Page>
  );
}

function LockedPage({ number, total, type, onVisible, data, onOpen }) {
  if (type === 'solution') return (
    <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
      <Text x={452.7} y={82.9} w={648.1} h={150} className="solution-needed-title">Solusi yang dibutuhkan</Text>
      <Image src="s09-p02.jpg" x={232.4} y={305.5} w={440.6} h={495} className="contain-image" />
      <Image src="s09-p01.png" x={630.5} y={319} w={759.8} h={481.5} className="contain-image" />
    </Page>
  );

  if (type === 'diagram') return (
    <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
      <Image src="s10-p01.png" x={0} y={93.9} w={1600} h={761.7} className="contain-image" />
    </Page>
  );

  if (type === 'comparison') return (
    <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
      <Image src="s13-p01.png" x={0} y={93.9} w={1600} h={761.7} className="contain-image" />
    </Page>
  );

  if (type === 'benefits') return (
    <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
      <Text x={-52.6} y={92.4} w={907.3} h={99} className="benefits-title">Manfaat  ETS :</Text>
      <div className="benefit-grid">
        {[
          ['Auto Cut-off Protection', 'ETS akan memutus input aliran listrik ketika mendeteksi adanya tegangan extreme/surge'],
          ['Auto Overload Protection', 'Output ETS akan di shutdown ketika ETS mendeteksi adanya beban berlebih'],
          ['Filtering', 'ETS akan menyaring / filter input listrik dari noise ( harmonic, transient, flicker )'],
          ['Stabilizing', 'ETS akan menstabilkan tegangan yang tidak normal dengan range yang lebar ( 150 V s/d 250 V )'],
          ['Zero Ground Processing', 'ETS akan memperbaiki kualitas ground hingga mendekati “nol” atau di bawah “1” Volt'],
          ['Network Line Protector / NLP', '( Additional Fitur )\nFungsi tambahan yang mampu melakukan Proteksi Aktif pada jalur kabel Data/ Komunikasi, selain proteksi di jalur kabel Power/Listrik'],
        ].map(([h, b]) => <div key={h}><h3>{h}</h3><p>{b}</p></div>)}
      </div>
    </Page>
  );

  if (type === 'personalised' || type === 'personalised2' || type === 'centralised') {
    const index = type === 'personalised' ? 0 : type === 'personalised2' ? 1 : 0;
    const p = data.products[index] || data.products[0] || {};
    const title = type === 'personalised' ? `1.  ${p.name || 'UPS EATON (60 KVA)'}` : type === 'personalised2' ? `2.  ${p.name || 'UPS EATON (120 KVA)'}` : '3.  UPS EATON (60 KVA & 120 KVA)';
    const ets = type === 'centralised' ? 'ETS 200 KVA' : `ETS ${p.capacity || (index === 0 ? '60 KVA' : '120 KVA')}`;
    const ups = type === 'centralised' ? 'UPS 60 KVA & 120 KVA' : (p.name || (index === 0 ? 'UPS 60 KVA' : 'UPS 120 KVA'));
    const covered = type === 'centralised' ? 'Perangkat Yang tercover UPS' : (p.covered || `Perangkat Yang tercover UPS ${p.capacity || ''}`);
    const heading = type === 'centralised' ? 'DESAIN SOLUSI CENTRALISED' : 'DESAIN SOLUSI PERSONALISED';
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Text x={0} y={-6} w={519.2} h={85.6} className="solution-heading">{heading}</Text>
        <Text x={93.9} y={140.3} w={500} h={48.5} className="solution-subheading">{title}</Text>
        <Box x={58.6} y={351.9} w={167.3} h={157.4} className="source-box">Sumber<br/>Listrik</Box>
        <div className="flow-arrow arrow-a">→</div>
        {type !== 'centralised' ? <>
          <Image src={index === 0 ? 's14-p01.png' : 's15-p01.png'} x={400.3} y={249.9} w={235.4} h={375.6} className="contain-image" />
          <Image src={index === 0 ? 's14-p02.jpg' : 's15-p02.jpg'} x={813.7} y={259.8} w={273.5} h={364.7} className="contain-image" />
          <div className="flow-arrow arrow-b">→</div>
          <div className="flow-arrow arrow-c">→</div>
          <Text x={408.8} y={633} w={218.4} h={60.6} className="solution-label">{ets}<br/><i>(Three Phase)</i></Text>
          <Text x={841.2} y={633.2} w={218.4} h={36.4} className="solution-label">{ups}</Text>
        </> : <>
          <Image src="s16-p01.png" x={400.3} y={249.9} w={235.4} h={375.6} className="contain-image" />
          <Image src="s16-p02.jpg" x={806.7} y={324} w={176.3} h={235.1} className="contain-image" />
          <Image src="s16-p03.jpg" x={990.7} y={322.3} w={176.3} h={235.1} className="contain-image" />
          <div className="flow-arrow arrow-b">→</div>
          <div className="flow-arrow arrow-c">→</div>
          <Text x={408.8} y={633} w={218.4} h={60.6} className="solution-label">{ets}<br/><i>(Three Phase)</i></Text>
          <Text x={873.8} y={586} w={218.4} h={36.4} className="solution-label">{ups}</Text>
        </>}
        <Box x={953.9} y={345.7} w={267.5} h={157.4} className="dark-box">{covered}</Box>
      </Page>
    );
  }

  if (type === 'summary') return (
    <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
      <Text x={170.8} y={183.3} w={1020.6} h={48.5} className="summary-title">SUMMARY KEBUTUHAN ETS DI {data.clientName.replace(/^PT\s+/i, 'PT ')}</Text>
      <table className="summary-table">
        <thead><tr><th>No</th><th>AREA</th><th>QTY<br/>(unit)</th><th>KETERANGAN</th></tr></thead>
        <tbody>
          {data.products.map((p, i) => <tr key={i}><td>{i + 1}.</td><td>{p.name}<br/>ETS {p.capacity} (Three Phase)</td><td>1</td><td>Personalised</td></tr>)}
          <tr><td>{data.products.length + 1}.</td><td>UPS {data.products.map(p => p.capacity).join(' & ')}<br/>ETS 200 KVA (Three Phase)</td><td>1</td><td>Centralised</td></tr>
        </tbody>
      </table>
    </Page>
  );
  return null;
}

function PageModal({ source, pageNumber, onClose }) {
  const hostRef = useRef(null);
  const viewportRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef({ mode: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0, startDistance: 0, startZoom: 1 });

  useEffect(() => {
    if (!hostRef.current || !source) return;
    const clone = source.cloneNode(true);
    clone.classList.remove('report-page-clickable');
    clone.removeAttribute('onClick');
    clone.style.position = 'relative';
    clone.style.display = 'block';
    clone.style.width = '1600px';
    clone.style.height = '900px';
    clone.style.maxWidth = 'none';
    clone.style.aspectRatio = 'auto';
    hostRef.current.replaceChildren(clone);
    return () => hostRef.current?.replaceChildren();
  }, [source]);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availableW = Math.max(280, vw - 28);
      const availableH = Math.max(240, vh - 145);
      setBaseScale(Math.min(availableW / 1600, availableH / 900));
      setPan({ x: 0, y: 0 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)));
      if (e.key === '-') setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clampZoom = (value) => Math.max(0.5, Math.min(4, value));
  const distance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      gesture.current = { mode: 'pinch', startDistance: distance(e.touches), startZoom: zoom };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      gesture.current = { mode: 'pan', startX: t.clientX, startY: t.clientY, startPanX: pan.x, startPanY: pan.y };
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      if (gesture.current.mode !== 'pinch') return;
      const ratio = distance(e.touches) / gesture.current.startDistance;
      setZoom(clampZoom(gesture.current.startZoom * ratio));
    } else if (e.touches.length === 1 && gesture.current.mode === 'pan') {
      const t = e.touches[0];
      setPan({ x: gesture.current.startPanX + t.clientX - gesture.current.startX, y: gesture.current.startPanY + t.clientY - gesture.current.startY });
    }
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    gesture.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (gesture.current.mode !== 'pan' || e.pointerType === 'touch') return;
    setPan({ x: gesture.current.startPanX + e.clientX - gesture.current.startX, y: gesture.current.startPanY + e.clientY - gesture.current.startY });
  };
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => clampZoom(z * (e.deltaY < 0 ? 1.1 : 0.9)));
  };

  const scale = baseScale * zoom;
  const modal = (
    <div className="page-modal" role="dialog" aria-modal="true" aria-label={`Preview halaman ${pageNumber}`}>
      <div className="page-modal-topbar"><span className="modal-version">REPORT VIEWER • v2.7.1</span>
        <strong>Halaman {pageNumber}</strong>
        <div className="page-modal-tools">
          <button onClick={() => setZoom(z => clampZoom(z - 0.25))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => clampZoom(z + 0.25))}>+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          <button className="modal-close" onClick={onClose}>Tutup</button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="page-modal-viewport"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div className="page-modal-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
          <div ref={hostRef} className="page-modal-host" />
        </div>
        <div className="page-modal-help">Cubit untuk zoom • Geser untuk pan • Esc untuk tutup</div>
      </div>
    </div>
  );

  // Render the viewer directly under <body>. This avoids stacking-context and
  // overflow issues caused by the preview section, sticky toolbar, or parent
  // containers. The viewer must always sit above the entire application.
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}

export default function Preview({ data }) {
  const [current, setCurrent] = useState(1);
  const [selectedPage, setSelectedPage] = useState(null);
  const pagesRef = useRef(null);
  const productCount = data.products.length;
  const firstPostProduct = 3 + productCount * 2;
  const total = firstPostProduct + 9 + (productCount > 1 ? 1 : 0);

  const [renderScale, setRenderScale] = useState(2.5);
  const [isExporting, setIsExporting] = useState(false);
  const MIN_RENDER_SCALE = 0.5;
  const MAX_RENDER_SCALE = 5;
  const JPEG_QUALITY = 0.9;

  const normalizedRenderScale = Math.min(
    MAX_RENDER_SCALE,
    Math.max(MIN_RENDER_SCALE, Number.isFinite(Number(renderScale)) ? Number(renderScale) : 2.5)
  );

  async function renderExportBitmaps() {
    const [{ default: html2canvas }] = await Promise.all([import('html2canvas')]);
    const pages = [...pagesRef.current.querySelectorAll('.report-page')];
    let exportRoot = null;

    try {
      exportRoot = document.createElement('div');
      exportRoot.className = 'pdf-export-root';
      exportRoot.setAttribute('aria-hidden', 'true');
      exportRoot.style.cssText = [
        'position:fixed',
        'left:-20000px',
        'top:0',
        'width:1600px',
        'height:auto',
        'z-index:0',
        'pointer-events:none',
        'background:#fff',
        'visibility:visible',
      ].join(';');

      pages.forEach((page) => {
        const clone = page.cloneNode(true);
        clone.classList.add('pdf-export-page');
        clone.style.width = '1600px';
        clone.style.height = '900px';
        clone.style.maxWidth = 'none';
        clone.style.aspectRatio = 'auto';
        clone.querySelectorAll('.page-indicator,.template-badge,.pdf-ui-only').forEach(el => el.remove());
        exportRoot.appendChild(clone);
      });

      document.body.appendChild(exportRoot);
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const bitmaps = [];
      for (let i = 0; i < exportRoot.children.length; i++) {
        const page = exportRoot.children[i];
        const canvas = await html2canvas(page, {
          scale: normalizedRenderScale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#fff',
          logging: false,
          imageTimeout: 15000,
          width: 1600,
          height: 900,
          windowWidth: 1600,
          windowHeight: 900,
          removeContainer: true,
        });

        bitmaps.push(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        canvas.width = 1;
        canvas.height = 1;
      }

      return bitmaps;
    } finally {
      exportRoot?.remove();
    }
  }

  async function downloadPdf() {
    const button = document.querySelector('.download-pdf');
    const pptxButton = document.querySelector('.download-pptx');
    setIsExporting(true);
    if (button) button.disabled = true;
    if (pptxButton) pptxButton.disabled = true;
    if (button) button.textContent = 'Membuat PDF…';

    try {
      const [{ jsPDF }, bitmaps] = await Promise.all([
        import('jspdf'),
        renderExportBitmaps(),
      ]);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1600, 900],
        compress: true,
      });

      bitmaps.forEach((image, i) => {
        if (i > 0) pdf.addPage([1600, 900], 'landscape');
        pdf.addImage(image, 'JPEG', 0, 0, 1600, 900, undefined, 'FAST');
      });

      pdf.save(`${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('PDF gagal dibuat. Silakan coba lagi.');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Unduh PDF'; }
      if (pptxButton) pptxButton.disabled = false;
      setIsExporting(false);
    }
  }

  async function downloadPptx() {
    const button = document.querySelector('.download-pdf');
    const pptxButton = document.querySelector('.download-pptx');
    setIsExporting(true);
    if (button) button.disabled = true;
    if (pptxButton) pptxButton.disabled = true;
    if (pptxButton) pptxButton.textContent = 'Membuat PPTX…';

    try {
      const [{ default: PptxGenJS }, bitmaps] = await Promise.all([
        import('pptxgenjs'),
        renderExportBitmaps(),
      ]);

      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'ETS Report Builder';
      pptx.subject = data.reportType === 'final' ? 'Final Survey' : 'Survey';
      pptx.title = `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}`;
      pptx.company = 'ETS';
      pptx.lang = 'id-ID';

      bitmaps.forEach((image) => {
        const slide = pptx.addSlide();
        slide.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
      });

      await pptx.writeFile({
        fileName: `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}.pptx`,
        compression: true,
      });
    } catch (error) {
      console.error('PPTX export failed:', error);
      window.alert('PPTX gagal dibuat. Pastikan koneksi internet tidak memblokir asset/library lalu coba lagi.');
    } finally {
      if (button) button.disabled = false;
      if (pptxButton) { pptxButton.disabled = false; pptxButton.textContent = 'Unduh PPTX'; }
      setIsExporting(false);
    }
  }

  const openPage = (el) => setSelectedPage(el);

  return (
    <section className="preview-wrap" id="report-preview">
      <div className="preview-toolbar">
        <div><div className="eyebrow light">LIVE PREVIEW</div><h2>Preview dokumen</h2><p>Export menggunakan bitmap berkualitas tinggi agar PDF dan PPTX mengikuti preview.</p></div>
        <div className="preview-actions">
          <span className="preview-layout-badge">2 KOLOM • BITMAP • VIEWER v2.7.1</span>
          <label className="render-scale-control" title="Skala render bitmap saat export">
            <span>Skala render</span>
            <input
              type="number"
              min={MIN_RENDER_SCALE}
              max={MAX_RENDER_SCALE}
              step="0.1"
              inputMode="decimal"
              value={renderScale}
              disabled={isExporting}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setRenderScale('');
                  return;
                }
                const parsed = Number.parseFloat(value);
                if (Number.isFinite(parsed)) setRenderScale(Math.min(MAX_RENDER_SCALE, Math.max(MIN_RENDER_SCALE, parsed)));
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(renderScale))) setRenderScale(2.5);
              }}
              aria-label="Skala render bitmap"
            />
            <small>{Math.round(1600 * normalizedRenderScale)}×{Math.round(900 * normalizedRenderScale)} px</small>
          </label>
          <div className="page-counter">Halaman <b>{current}</b> / {total}</div>
          <button className="download-pptx" onClick={downloadPptx}>Unduh PPTX</button>
          <button className="download-pdf" onClick={downloadPdf}>Unduh PDF</button>
        </div>
      </div>
      <div className="pages" ref={pagesRef}>
        <Page number={1} total={total} cover onVisible={setCurrent} onOpen={openPage}>
          <Box x={150.4} y={396.5} w={226.8} h={226.8} className="client-logo-box"><Image src={data.clientLogo} x={0} y={0} w={226.8} h={226.8} className="client-logo" /></Box>
          <Text x={412.4} y={378.0} w={1083.6} h={56} className="cover-title">{data.coverTitle}</Text>
          <Text x={410} y={451} w={1060} h={34} className="cover-subtitle-main">UNTUK MEMPROTEKSI PERANGKAT DATA CENTER</Text>
          <Text x={410} y={501} w={1060} h={34} className="cover-subtitle-client">DI {data.clientName}</Text>
          <Text x={410} y={551} w={1060} h={92} className="cover-address">{data.address}</Text>
        </Page>

        <Page number={2} total={total} cover onVisible={setCurrent} onOpen={openPage}>
          <Text x={0} y={342} w={1600} h={132} className="survey-cover-title">HASIL SURVEI<br/><span>{data.clientName.replace(/\s*\(ASNET\)\s*/i, '').replace(/^PT\s+/i, 'PT ') } - {data.surveyLocation || 'BOGOR'}</span></Text>
          <Text x={0} y={468} w={1600} h={50} className="survey-date">Hari &amp; Tanggal : {data.surveyDate}</Text>
        </Page>

        {data.products.map((p, i) => <React.Fragment key={i}><ProductPageA p={p} number={3 + i * 2} total={total} onVisible={setCurrent} onOpen={openPage} /><ProductPageB p={p} number={4 + i * 2} total={total} onVisible={setCurrent} onOpen={openPage} /></React.Fragment>)}

        <Page number={firstPostProduct} total={total} onVisible={setCurrent} onOpen={openPage}>
          <Text x={397} y={97.9} w={806} h={60.6} className="section-page-title">KONDISI HASIL SURVEI SECARA UMUM :</Text>
          <div className="finding-list exact-findings">{data.findings.map((x, i) => <div key={i}><b>{String.fromCharCode(65 + i)}.</b><span>{x}</span></div>)}</div>
        </Page>

        <Page number={firstPostProduct + 1} total={total} onVisible={setCurrent} onOpen={openPage}>
          <Text x={465.6} y={97.4} w={668.7} h={49.3} className="required-title">DESIGN SOLUSI YANG DIBUTUHKAN :</Text>
          <div className="solution-list exact-solutions">{data.requiredSolution.map((x, i) => <div key={i}>• {x}</div>)}</div>
        </Page>

        <LockedPage number={firstPostProduct + 2} type="solution" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
        <LockedPage number={firstPostProduct + 3} type="diagram" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />

        <Page number={firstPostProduct + 4} total={total} onVisible={setCurrent} onOpen={openPage}>
          <Text x={75} y={141.3} w={1502.4} h={953.2} className="explanation-text"><strong>Penjelasan Gambar Diatas :</strong><br/><br/>{data.explanation}<br/><br/>Bila terjadi power extreme karena efek sambaran petir yang dibuang oleh penangkal petir outdoor kemudian masuk melalui grounding elektronik, maka ETS akan melakukan proteksi dengan cara memutus aliran listrik yang masuk ke dalam jaringan.<br/><br/>Bila terjadi power extreme karena efek sambaran petir yang masuk melalui jalur jala-jala listrik (phasa dan netral), maka ETS akan melakukan proteksi juga.</Text>
        </Page>

        <LockedPage number={firstPostProduct + 5} type="benefits" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
        <LockedPage number={firstPostProduct + 6} type="comparison" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
        <LockedPage number={firstPostProduct + 7} type="personalised" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
        {data.products.length > 1 && <LockedPage number={firstPostProduct + 8} type="personalised2" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />}
        <LockedPage number={firstPostProduct + (data.products.length > 1 ? 9 : 8)} type="centralised" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
        <LockedPage number={firstPostProduct + (data.products.length > 1 ? 10 : 9)} type="summary" total={total} onVisible={setCurrent} data={data} onOpen={openPage} />
      </div>
      {selectedPage && <PageModal source={selectedPage} pageNumber={selectedPage.dataset.page} onClose={() => setSelectedPage(null)} />}
    </section>
  );
}
