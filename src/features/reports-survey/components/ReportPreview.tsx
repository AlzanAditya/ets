import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import { ReportData, ProductData } from '../types'
import { ASSET } from '../data/template'
import { SmartImage } from '@/components/ui/smart-image'
import {
  exportDocumentPagesToPdf,
  exportDocumentPagesToForeignObjectPdf,
  exportDocumentPagesToPptx,
  exportDocumentPagesToNativePrint,
} from '@/lib/document-exporter'

const A = ASSET
const BG1 = `${A}bg-01.png`
const BG2 = `${A}bg-02.png`

interface PageProps {
  number: number
  total: number
  children: React.ReactNode
  cover?: boolean
  className?: string
  locked?: boolean
  onVisible?: (page: number) => void
  onOpen?: (el: HTMLElement, pageNum: number) => void
}

function ScaledPageContainer({
  children,
  className = '',
  style = {},
  onClick,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      if (el.clientWidth > 0) {
        setScale(el.clientWidth / 1600)
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`report-page-wrapper ${className}`}
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          width: '1600px',
          height: '900px',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Page({
  number,
  total,
  children,
  cover = false,
  className = '',
  locked = false,
  onVisible,
  onOpen,
}: PageProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !onVisible) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(number)
      },
      { threshold: 0.55 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [number, onVisible])

  return (
    <ScaledPageContainer>
      <article
        ref={ref}
        data-page={number}
        className={`report-page ${className}${onOpen ? ' report-page-clickable' : ''}`}
        onClick={onOpen ? (e) => onOpen(e.currentTarget as HTMLElement, number) : undefined}
      >
        <SmartImage src={cover ? BG1 : BG2} className="report-bg" alt="" />
        {children}
        <span className="page-indicator pdf-ui-only">
          Halaman {number} / {total}
        </span>
        {locked && <span className="template-badge pdf-ui-only">TEMPLATE</span>}
      </article>
    </ScaledPageContainer>
  )
}

function Text({
  left,
  top,
  width,
  height,
  children,
  className = '',
  style = {},
}: {
  left: string
  top: string
  width: string
  height?: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`report-text ${className}`}
      style={{
        left,
        top,
        width,
        minHeight: height || 'auto',
        height: 'auto',
        overflow: 'visible',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Img({
  src,
  left,
  top,
  width,
  height,
  className = '',
  style = {},
}: {
  src?: string
  left: string
  top: string
  width: string
  height: string
  className?: string
  style?: React.CSSProperties
}) {
  if (!src) return null
  const resolved = /^(?:data:|blob:|https?:|\/)/.test(src) ? src : A + src
  return (
    <SmartImage
      src={resolved}
      alt=""
      className={`report-image ${className}`}
      style={{ left, top, width, height, ...style }}
    />
  )
}

const productPageASlots = [
  { left: '25.14%', top: '11.92%', width: '17.09%', height: '40.52%' },
  { left: '46.38%', top: '11.92%', width: '17.09%', height: '40.52%' },
  { left: '66.59%', top: '11.92%', width: '17.09%', height: '40.52%' },
  { left: '25.14%', top: '53.8%', width: '17.09%', height: '40.52%' },
  { left: '46.3%', top: '53.8%', width: '17.09%', height: '40.52%' },
  { left: '66.41%', top: '53.8%', width: '17.09%', height: '40.52%' },
]

const productPageBSlots = [
  { left: '16.1%', top: '18.98%', width: '20.725%', height: '49.12%' },
  { left: '40.25%', top: '19.11%', width: '20.725%', height: '49.12%' },
  { left: '64.41%', top: '19.03%', width: '20.725%', height: '49.12%' },
]

const productPageBSlots4 = [
  { left: '8.59%', top: '21.34%', width: '19.85%', height: '47.05%' },
  { left: '30.7%', top: '21.34%', width: '19.85%', height: '47.05%' },
  { left: '52.81%', top: '21.34%', width: '19.85%', height: '47.05%' },
  { left: '74.92%', top: '21.34%', width: '19.85%', height: '47.05%' },
]

function PhotoGrid({
  photos = [],
  slots,
  labels = [],
}: {
  photos: string[]
  slots: { left: string; top: string; width: string; height: string }[]
  labels?: string[]
}) {
  return (
    <>
      {photos.slice(0, slots.length).map((src, i) => {
        const slot = slots[i]
        const label = labels[i]
        return (
          <React.Fragment key={`${src}-${i}`}>
            <Img src={src} {...slot} className="portrait-photo" />
            {label && (
              <div
                className="photo-label"
                style={{
                  left: `calc(${slot.left} + ${slot.width} - 10.25%)`,
                  top: `calc(${slot.top} + ${slot.height} - 3.78%)`,
                  width: '10.25%',
                  height: '3.78%',
                }}
              >
                {label}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

function ProductPageA({
  p,
  number,
  total,
  onVisible,
  onOpen,
}: {
  p: ProductData
  number: number
  total: number
  onVisible?: (n: number) => void
  onOpen?: (el: HTMLElement, pageNum: number) => void
}) {
  return (
    <Page number={number} total={total} onVisible={onVisible} onOpen={onOpen}>
      <Text left="0.5%" top="10.77%" width="22%" height="5.33%" className="product-heading">
        {p.name}
      </Text>
      <PhotoGrid
        photos={p.photos}
        slots={productPageASlots}
        labels={['', '', '', '', '', '']}
      />
      <Text left="32.08%" top="90.28%" width="10.15%" height="4.04%" className="phase-reading">
        PHASE R : {p.phaseR}
      </Text>
      <Text left="53.33%" top="90.28%" width="10.15%" height="4.04%" className="phase-reading">
        PHASE S : {p.phaseS}
      </Text>
      <Text left="73.53%" top="90.28%" width="10.15%" height="4.04%" className="phase-reading">
        PHASE T : {p.phaseT}
      </Text>
    </Page>
  )
}

function renderRedText(text: string) {
  if (!text) return '-'
  const regex = /(Tidak\s*Ada|Tidak\s*ada|tidak\s*ada)/gi
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (/^Tidak\s*ada$/i.test(part)) {
      return (
        <span key={i} style={{ color: '#ff0000', fontWeight: 'bold' }}>
          {part}
        </span>
      )
    }
    return part
  })
}

function SurveyTable({ p }: { p: ProductData }) {
  const powerProt = p.powerProtection || 'Tidak Ada'
  const commProt = p.communicationProtection || 'Tidak ada'

  const rows: Array<{
    label: string
    sub?: string
    value: React.ReactNode
  }> = [
    {
      label: '1. TEGANGAN',
      sub: '( Ideal  220 V ± 3 % )',
      value: renderRedText(p.voltage || '228–229 V'),
    },
    {
      label: '2. GROUNDING',
      sub: '( ideal < 1 Volt )',
      value: renderRedText(p.grounding || '0,3 V'),
    },
    {
      label: '3. UPS',
      value: renderRedText(p.ups || '-'),
    },
    {
      label: '4. STABILIZER',
      value: renderRedText(p.stabilizer || '-'),
    },
    {
      label: '5. PROTEKSI EXISTING',
      value: (
        <span>
          Power : {renderRedText(powerProt)} , Line Komunikasi : {renderRedText(commProt)}
        </span>
      ),
    },
    {
      label: '6. LINE KOMUNIKASI/DATA',
      value: renderRedText('-'),
    },
    {
      label: '7. BEBAN',
      value: renderRedText(p.load || '-'),
    },
    {
      label: '8. CATATAN',
      value: renderRedText(
        p.note
          ? p.note.startsWith('•')
            ? p.note
            : `•   ${p.note}`
          : '•   Tidak ada proteksi terhadap over voltage & surge voltage.'
      ),
    },
  ]

  return (
    <div
      className="survey-table"
      style={{ left: '22.9%', top: '70.5%', width: '54.2%' }}
    >
      <div className="survey-table-title">HASIL SURVEY &amp; PENGUKURAN</div>
      {rows.map((row) => (
        <div className="survey-row" key={row.label}>
          <div className="survey-label">
            <span>{row.label}</span>
            {row.sub && <span className="survey-sub">{row.sub}</span>}
          </div>
          <div className="survey-value">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function ProductPageB({
  p,
  number,
  total,
  onVisible,
  onOpen,
}: {
  p: ProductData
  number: number
  total: number
  onVisible?: (n: number) => void
  onOpen?: (el: HTMLElement, pageNum: number) => void
}) {
  const four = p.measurementPhotos.length > 3
  const slots = four ? productPageBSlots4 : productPageBSlots
  const labels = four
    ? ['PHASE R - N', 'PHASE S - N', 'PHASE T - N', 'PHASE N - G']
    : ['PHASE R - N', 'PHASE S - N', 'PHASE T - N']
  return (
    <Page number={number} total={total} onVisible={onVisible} onOpen={onOpen}>
      <Text left="1.375%" top="10.77%" width="22%" height="5.33%" className="product-heading">
        {p.name}
      </Text>
      <PhotoGrid photos={p.measurementPhotos} slots={slots} labels={labels} />
      <SurveyTable p={p} />
    </Page>
  )
}

function LockedPage({
  number,
  total,
  type,
  onVisible,
  data,
  onOpen,
}: {
  number: number
  total: number
  type: string
  onVisible?: (n: number) => void
  data: ReportData
  onOpen?: (el: HTMLElement, pageNum: number) => void
}) {
  if (type === 'solution')
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Text left="0%" top="19.21%" width="100%" height="16.66%" className="solution-needed-title">
          Solusi yang dibutuhkan
        </Text>
        <Img src="s09-p02.jpg" left="14.52%" top="33.94%" width="27.538%" height="55.0%" className="contain-image" />
        <Img src="s09-p01.png" left="39.4%" top="35.44%" width="47.48%" height="53.5%" className="contain-image" />
      </Page>
    )

  if (type === 'diagram')
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Img src="s10-p01.png" left="0%" top="10.43%" width="100%" height="84.63%" className="contain-image" />
      </Page>
    )

  if (type === 'comparison')
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Img src="s13-p01.png" left="0%" top="10.43%" width="100%" height="84.63%" className="contain-image" />
      </Page>
    )

  if (type === 'benefits')
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Text left="-3.28%" top="10.26%" width="56.7%" height="11.0%" className="benefits-title">
          Manfaat  ETS :
        </Text>
        <div className="benefit-grid" style={{ left: '8.75%', top: '25.56%', width: '82.5%', height: '66.6%' }}>
          {[
            ['Auto Cut-off Protection', 'ETS akan memutus input aliran listrik ketika mendeteksi adanya tegangan extreme/surge'],
            ['Auto Overload Protection', 'Output ETS akan di shutdown ketika ETS mendeteksi adanya beban berlebih'],
            ['Filtering', 'ETS akan menyaring / filter input listrik dari noise ( harmonic, transient, flicker )'],
            ['Stabilizing', 'ETS akan menstabilkan tegangan yang tidak normal dengan range yang lebar ( 150 V s/d 250 V )'],
            ['Zero Ground Processing', 'ETS akan memperbaiki kualitas ground hingga mendekati “nol” atau di bawah “1” Volt'],
            [
              'Network Line Protector / NLP',
              '( Additional Fitur )\nFungsi tambahan yang mampu melakukan Proteksi Aktif pada jalur kabel Data/ Komunikasi, selain proteksi di jalur kabel Power/Listrik',
            ],
          ].map(([h, b]) => (
            <div key={h}>
              <h3>{h}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{b}</p>
            </div>
          ))}
        </div>
      </Page>
    )

  if (type === 'personalised' || type === 'personalised2' || type === 'centralised') {
    const index = type === 'personalised' ? 0 : type === 'personalised2' ? 1 : 0
    const p = data.products[index] || data.products[0] || ({} as ProductData)
    const title =
      type === 'personalised'
        ? `1.  ${p.name || 'UPS EATON (60 KVA)'}`
        : type === 'personalised2'
        ? `2.  ${p.name || 'UPS EATON (120 KVA)'}`
        : '3.  UPS EATON (60 KVA & 120 KVA)'
    const ets = type === 'centralised' ? 'ETS 200 KVA' : `ETS ${p.capacity || (index === 0 ? '60 KVA' : '120 KVA')}`
    const ups =
      type === 'centralised'
        ? 'UPS 60 KVA & 120 KVA'
        : p.name || (index === 0 ? 'UPS 60 KVA' : 'UPS 120 KVA')
    const covered =
      type === 'centralised'
        ? 'Perangkat Yang tercover UPS'
        : p.covered || `Perangkat Yang tercover UPS ${p.capacity || ''}`
    const heading = type === 'centralised' ? 'DESAIN SOLUSI CENTRALISED' : 'DESAIN SOLUSI PERSONALISED'
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Text left="1.2%" top="3.3%" width="85%" height="4.5%" className="solution-heading">
          {heading}
        </Text>
        <Text left="5.86%" top="15.58%" width="40%" height="5.38%" className="solution-subheading">
          {title}
        </Text>
        <div className="source-box" style={{ left: '4.8%', top: '38.5%', width: '11.0%', height: '16.5%' }}>
          Sumber<br />Listrik
        </div>
        <div className="flow-arrow" style={{ left: '17.2%', top: '43.5%', width: '5.0%', height: '5.5%' }}>
          →
        </div>
        {type !== 'centralised' ? (
          <>
            <div style={{ position: 'absolute', left: '24.5%', top: '23.0%', width: '15.0%', height: '43.0%', border: '1px solid #111', boxSizing: 'border-box' }}>
              <Img
                src={index === 0 ? 's14-p01.png' : 's15-p01.png'}
                left="0%"
                top="0%"
                width="100%"
                height="100%"
                className="contain-image"
              />
            </div>
            <div style={{ position: 'absolute', left: '48.5%', top: '23.0%', width: '18.0%', height: '43.0%', border: '1px dashed #666', boxSizing: 'border-box' }}>
              <Img
                src={index === 0 ? 's14-p02.jpg' : 's15-p02.jpg'}
                left="0%"
                top="0%"
                width="100%"
                height="100%"
                className="contain-image"
              />
            </div>
            <div className="flow-arrow" style={{ left: '41.2%', top: '43.5%', width: '5.0%', height: '5.5%' }}>
              →
            </div>
            <div className="flow-arrow" style={{ left: '68.5%', top: '43.5%', width: '5.0%', height: '5.5%' }}>
              →
            </div>
            <Text left="24.5%" top="68.0%" width="15.0%" height="7.0%" className="solution-label">
              {ets}
              <br />
              <i>(Three Phase)</i>
            </Text>
            <Text left="48.5%" top="68.0%" width="18.0%" height="5.0%" className="solution-label">
              {ups}
            </Text>
            <div className="dark-box" style={{ left: '75.5%', top: '38.5%', width: '18.5%', height: '16.5%' }}>
              {covered}
            </div>
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', left: '24.2%', top: '23.0%', width: '15.0%', height: '43.0%', border: '1px solid #111', boxSizing: 'border-box' }}>
              <Img src="s16-p01.png" left="0%" top="0%" width="100%" height="100%" className="contain-image" />
            </div>
            <div style={{ position: 'absolute', left: '47.5%', top: '23.0%', width: '23.5%', height: '43.0%', border: '1px dashed #666', boxSizing: 'border-box' }}>
              <Img src="s16-p02.jpg" left="2%" top="2%" width="46%" height="96%" className="contain-image" />
              <Img src="s16-p03.jpg" left="52%" top="2%" width="46%" height="96%" className="contain-image" />
            </div>
            <div className="flow-arrow" style={{ left: '40.8%', top: '43.5%', width: '5.0%', height: '5.5%' }}>
              →
            </div>
            <div className="flow-arrow" style={{ left: '72.2%', top: '43.5%', width: '5.0%', height: '5.5%' }}>
              →
            </div>
            <Text left="24.2%" top="68.0%" width="15.0%" height="7.0%" className="solution-label">
              {ets}
              <br />
              <i>(Three Phase)</i>
            </Text>
            <Text left="47.5%" top="68.0%" width="23.5%" height="5.0%" className="solution-label">
              {ups}
            </Text>
            <div className="dark-box" style={{ left: '78.5%', top: '38.5%', width: '16.5%', height: '16.5%' }}>
              {covered}
            </div>
          </>
        )}
      </Page>
    )
  }

  if (type === 'summary')
    return (
      <Page number={number} total={total} locked onVisible={onVisible} onOpen={onOpen}>
        <Text left="10.675%" top="20.36%" width="78.64%" className="summary-title">
          SUMMARY KEBUTUHAN ETS DI {data.clientName.replace(/^PT\s+/i, 'PT ')}
        </Text>
        <table className="summary-table" style={{ left: '10.675%', top: '25.5%', width: '78.64%' }}>
          <thead>
            <tr>
              <th style={{ width: '6%' }}>No</th>
              <th style={{ width: '54%' }}>AREA</th>
              <th style={{ width: '15%' }}>
                QTY
                <br />
                (unit)
              </th>
              <th style={{ width: '25%' }}>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p, i) => (
              <React.Fragment key={i}>
                <tr className="item-header-row">
                  <td>{i + 1}.</td>
                  <td className="area-cell">
                    <strong>{p.name}</strong>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
                <tr className="item-detail-row">
                  <td></td>
                  <td className="area-cell">
                    <span>ETS {p.capacity} (Three Phase)</span>
                  </td>
                  <td>1</td>
                  <td>Personalised</td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="item-header-row">
              <td>{data.products.length + 1}.</td>
              <td className="area-cell">
                <strong>UPS {data.products.map((p) => p.capacity).join(' & ')}</strong>
              </td>
              <td></td>
              <td></td>
            </tr>
            <tr className="item-detail-row">
              <td></td>
              <td className="area-cell">
                <span>ETS 200 KVA (Three Phase)</span>
              </td>
              <td>1</td>
              <td>Centralised</td>
            </tr>
          </tbody>
        </table>
      </Page>
    )
  return null
}

function RenderSinglePage({
  pageNumber,
  data,
  total,
  onVisible,
  onOpen,
}: {
  pageNumber: number
  data: ReportData
  total: number
  onVisible?: (n: number) => void
  onOpen?: (el: HTMLElement, pageNum: number) => void
}) {
  const productCount = data.products.length
  const firstPostProduct = 3 + productCount * 2

  if (pageNumber === 1) {
    return (
      <Page number={1} total={total} cover onVisible={onVisible} onOpen={onOpen}>
        <div className="client-logo-box" style={{ left: '9.4%', top: '44.05%', width: '14.175%', height: '25.2%' }}>
          <Img src={data.clientLogo} left="0" top="0" width="100%" height="100%" className="client-logo" />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '25.625%',
            top: '41.5%',
            width: '67.5%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 5,
          }}
        >
          <div className="cover-title">{data.coverTitle}</div>
          <div className="cover-subtitle-main">UNTUK MEMPROTEKSI PERANGKAT DATA CENTER</div>
          <div className="cover-subtitle-client">DI {data.clientName}</div>
          <div className="cover-address">{data.address}</div>
        </div>
      </Page>
    )
  }

  if (pageNumber === 2) {
    return (
      <Page number={2} total={total} cover onVisible={onVisible} onOpen={onOpen}>
        <div
          style={{
            position: 'absolute',
            left: '5%',
            top: '35.0%',
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            zIndex: 5,
          }}
        >
          <div className="survey-cover-title">
            HASIL SURVEI
            <br />
            <span>
              {data.clientName.replace(/\s*\(ASNET\)\s*/i, '').replace(/^PT\s+/i, 'PT ')} -{' '}
              {data.surveyLocation || 'BOGOR'}
            </span>
          </div>
          <div className="survey-date">
            Hari &amp; Tanggal : {data.surveyDate}
          </div>
        </div>
      </Page>
    )
  }

  if (pageNumber >= 3 && pageNumber < firstPostProduct) {
    const productIndex = Math.floor((pageNumber - 3) / 2)
    const isProductA = (pageNumber - 3) % 2 === 0
    const p = data.products[productIndex] || data.products[0]
    if (isProductA) {
      return <ProductPageA p={p} number={pageNumber} total={total} onVisible={onVisible} onOpen={onOpen} />
    } else {
      return <ProductPageB p={p} number={pageNumber} total={total} onVisible={onVisible} onOpen={onOpen} />
    }
  }

  if (pageNumber === firstPostProduct) {
    return (
      <Page number={firstPostProduct} total={total} onVisible={onVisible} onOpen={onOpen}>
        <Text left="0%" top="20.87%" width="100%" className="section-page-title">
          KONDISI HASIL SURVEI SECARA UMUM :
        </Text>
        <div className="finding-list exact-findings" style={{ left: '2.54%', top: '27%', width: '94.88%', height: '67.7%' }}>
          {data.findings.map((x, i) => {
            const lines = x.split('\n')
            const title = lines[0]
            const body = lines.slice(1).join('\n')
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '8px', marginBottom: '16px' }}>
                <b>{String.fromCharCode(65 + i)}.</b>
                <div>
                  {body ? (
                    <>
                      <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '2px' }}>
                        {title}
                      </div>
                      <div style={{ fontWeight: 400, lineHeight: '1.28' }}>
                        {body}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontWeight: 700 }}>{x}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Page>
    )
  }

  if (pageNumber === firstPostProduct + 1) {
    return (
      <Page number={firstPostProduct + 1} total={total} onVisible={onVisible} onOpen={onOpen}>
        <Text left="0%" top="20.82%" width="100%" className="required-title">
          DESIGN SOLUSI YANG DIBUTUHKAN :
        </Text>
        <div className="exact-solutions solution-list" style={{ left: '9.69%', top: '31%', width: '80.625%', height: '63.3%' }}>
          {data.requiredSolution.map((x, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '6px', marginBottom: '20px', fontWeight: 700, lineHeight: '1.35' }}>
              <span>•</span>
              <span>{x}</span>
            </div>
          ))}
        </div>
      </Page>
    )
  }

  if (pageNumber === firstPostProduct + 2) {
    return <LockedPage number={firstPostProduct + 2} type="solution" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
  }

  if (pageNumber === firstPostProduct + 3) {
    return <LockedPage number={firstPostProduct + 3} type="diagram" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
  }

  if (pageNumber === firstPostProduct + 4) {
    return (
      <Page number={firstPostProduct + 4} total={total} onVisible={onVisible} onOpen={onOpen}>
        <Text left="4.68%" top="15.7%" width="93.9%" className="explanation-text">
          <strong>Penjelasan Gambar Diatas :</strong>
          <br />
          <br />
          {data.explanation}
          <br />
          <br />
          Bila terjadi power extreme karena efek sambaran petir yang dibuang oleh penangkal petir outdoor kemudian
          masuk melalui grounding elektronik, maka ETS akan melakukan proteksi dengan cara memutus aliran listrik yang
          masuk ke dalam jaringan.
          <br />
          <br />
          Bila terjadi power extreme karena efek sambaran petir yang masuk melalui jalur jala-jala listrik (phasa dan
          netral), maka ETS akan melakukan proteksi juga.
        </Text>
      </Page>
    )
  }

  if (pageNumber === firstPostProduct + 5) {
    return <LockedPage number={firstPostProduct + 5} type="benefits" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
  }

  if (pageNumber === firstPostProduct + 6) {
    return <LockedPage number={firstPostProduct + 6} type="comparison" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
  }

  if (pageNumber === firstPostProduct + 7) {
    return <LockedPage number={firstPostProduct + 7} type="personalised" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
  }

  if (productCount > 1) {
    if (pageNumber === firstPostProduct + 8) {
      return <LockedPage number={firstPostProduct + 8} type="personalised2" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
    }
    if (pageNumber === firstPostProduct + 9) {
      return <LockedPage number={firstPostProduct + 9} type="centralised" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
    }
    if (pageNumber === firstPostProduct + 10) {
      return <LockedPage number={firstPostProduct + 10} type="summary" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
    }
  } else {
    if (pageNumber === firstPostProduct + 8) {
      return <LockedPage number={firstPostProduct + 8} type="centralised" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
    }
    if (pageNumber === firstPostProduct + 9) {
      return <LockedPage number={firstPostProduct + 9} type="summary" total={total} onVisible={onVisible} data={data} onOpen={onOpen} />
    }
  }

  return null
}

function PageModal({
  pageNumber,
  data,
  total,
  onClose,
}: {
  pageNumber: number
  data: ReportData
  total: number
  onClose: () => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [baseScale, setBaseScale] = useState(0.5)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const gesture = useRef<{
    mode: 'pinch' | 'pan' | null
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    startDistance: number
    startZoom: number
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDistance: 0,
    startZoom: 1,
  })

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const availableW = Math.max(280, vw - 24)
      const availableH = Math.max(240, vh - 90)
      setBaseScale(Math.min(availableW / 1600, availableH / 900))
      setPan({ x: 0, y: 0 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
      if (e.key === '-') setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const clampZoom = (value: number) => Math.max(0.5, Math.min(4, value))
  const distance = (touches: React.TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      gesture.current = {
        mode: 'pinch',
        startX: 0,
        startY: 0,
        startPanX: pan.x,
        startPanY: pan.y,
        startDistance: distance(e.touches),
        startZoom: zoom,
      }
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      gesture.current = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        startDistance: 0,
        startZoom: zoom,
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (gesture.current.mode !== 'pinch') return
      const ratio = distance(e.touches) / gesture.current.startDistance
      setZoom(clampZoom(gesture.current.startZoom * ratio))
    } else if (e.touches.length === 1 && gesture.current.mode === 'pan') {
      const t = e.touches[0]
      setPan({
        x: gesture.current.startPanX + t.clientX - gesture.current.startX,
        y: gesture.current.startPanY + t.clientY - gesture.current.startY,
      })
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    gesture.current = {
      mode: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      startDistance: 0,
      startZoom: zoom,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (gesture.current.mode !== 'pan' || e.pointerType === 'touch') return
    setPan({
      x: gesture.current.startPanX + e.clientX - gesture.current.startX,
      y: gesture.current.startPanY + e.clientY - gesture.current.startY,
    })
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 0.9)))
  }

  const scale = baseScale * zoom
  const modal = (
    <div className="page-modal" role="dialog" aria-modal="true" aria-label={`Preview halaman ${pageNumber}`}>
      <div className="page-modal-topbar">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-400">Halaman {pageNumber}</span>
          <span className="text-xs text-slate-400">/ {total}</span>
        </div>
        <div className="page-modal-tools">
          <button
            type="button"
            className="tool-btn"
            title="Zoom Out (-)"
            onClick={() => setZoom((z) => clampZoom(z - 0.25))}
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="tool-btn"
            title="Zoom In (+)"
            onClick={() => setZoom((z) => clampZoom(z + 0.25))}
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="tool-btn"
            title="Reset Zoom"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="tool-btn modal-close"
            title="Tutup (Esc)"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
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
        <div
          className="page-modal-stage"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          <div className="page-modal-host">
            <RenderSinglePage pageNumber={pageNumber} data={data} total={total} />
          </div>
        </div>
        <div className="page-modal-help">Cubit / Gulir untuk zoom • Geser untuk pan • Esc untuk tutup</div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export default function ReportPreview({ data }: { data: ReportData }) {
  const [current, setCurrent] = useState(1)
  const [selectedPageNumber, setSelectedPageNumber] = useState<number | null>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const productCount = data.products.length
  const firstPostProduct = 3 + productCount * 2
  const total = firstPostProduct + 9 + (productCount > 1 ? 1 : 0)

  const [renderScale, setRenderScale] = useState<number | ''>(1.5)
  const [isExporting, setIsExporting] = useState(false)
  const MIN_RENDER_SCALE = 0.1

  const numScale = typeof renderScale === 'number' ? renderScale : 1.5
  const normalizedRenderScale = Number.isFinite(numScale) && numScale > 0 ? numScale : 1.5

  async function downloadPdf() {
    if (!pagesRef.current) return
    const pages = Array.from(pagesRef.current.querySelectorAll('.report-page')) as HTMLElement[]
    if (!pages.length) return

    const button = document.querySelector('.download-pdf') as HTMLButtonElement | null
    const pptxButton = document.querySelector('.download-pptx') as HTMLButtonElement | null
    setIsExporting(true)
    if (button) button.disabled = true
    if (pptxButton) pptxButton.disabled = true
    if (button) button.textContent = 'Membuat PDF…'

    try {
      const filename = `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}.pdf`
      await exportDocumentPagesToPdf(pages, {
        orientation: 'landscape',
        widthPx: 1600,
        heightPx: 900,
        scale: normalizedRenderScale,
        filename,
      })
    } catch (error) {
      console.error('PDF export failed:', error)
      window.alert('PDF gagal dibuat. Silakan coba lagi.')
    } finally {
      if (button) {
        button.disabled = false
      }
      if (pptxButton) pptxButton.disabled = false
      setIsExporting(false)
    }
  }

  async function downloadPdfNative() {
    if (!pagesRef.current) return
    const pages = Array.from(pagesRef.current.querySelectorAll('.report-page')) as HTMLElement[]
    if (!pages.length) return

    setIsExporting(true)
    try {
      const filename = `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}.pdf`
      await exportDocumentPagesToNativePrint(pages, {
        orientation: 'landscape',
        widthPx: 1600,
        heightPx: 900,
        filename,
      })
    } catch (error) {
      console.error('Native PDF print export failed:', error)
      window.alert('Gagal membuka dialog cetak PDF. Silakan coba lagi.')
    } finally {
      setIsExporting(false)
    }
  }

  async function downloadPdfForeignObject() {
    if (!pagesRef.current) return
    const pages = Array.from(pagesRef.current.querySelectorAll('.report-page')) as HTMLElement[]
    if (!pages.length) return

    setIsExporting(true)
    try {
      const filename = `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'} - Foreign Object.pdf`
      await exportDocumentPagesToForeignObjectPdf(pages, {
        orientation: 'landscape',
        widthPx: 1600,
        heightPx: 900,
        scale: normalizedRenderScale,
        filename,
      })
    } catch (error) {
      console.error('Foreign Object PDF export failed:', error)
      window.alert(`PDF Foreign Object gagal dibuat. ${error instanceof Error ? error.message : 'Terjadi kesalahan saat merender dokumen.'}`)
    } finally {
      setIsExporting(false)
    }
  }

  async function downloadPptx() {
    if (!pagesRef.current) return
    const pages = Array.from(pagesRef.current.querySelectorAll('.report-page')) as HTMLElement[]
    if (!pages.length) return

    const button = document.querySelector('.download-pdf') as HTMLButtonElement | null
    const pptxButton = document.querySelector('.download-pptx') as HTMLButtonElement | null
    setIsExporting(true)
    if (button) button.disabled = true
    if (pptxButton) pptxButton.disabled = true
    if (pptxButton) pptxButton.textContent = 'Membuat PPTX…'

    try {
      const filename = `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}.pptx`
      await exportDocumentPagesToPptx(pages, {
        orientation: 'landscape',
        widthPx: 1600,
        heightPx: 900,
        scale: normalizedRenderScale,
        filename,
        author: 'ETS Report Builder',
        subject: data.reportType === 'final' ? 'Final Survey' : 'Survey',
        title: `${data.clientName || 'ETS'} - ${data.reportType === 'final' ? 'Final Survey' : 'Survey'}`,
        company: 'ETS',
      })
    } catch (error) {
      console.error('PPTX export failed:', error)
      window.alert('PPTX gagal dibuat. Pastikan koneksi internet tidak memblokir asset/library lalu coba lagi.')
    } finally {
      if (button) button.disabled = false
      if (pptxButton) {
        pptxButton.disabled = false
        pptxButton.textContent = 'Unduh PPTX'
      }
      setIsExporting(false)
    }
  }

  const handleOpenPage = (_el: HTMLElement, pageNum: number) => {
    setSelectedPageNumber(pageNum)
  }

  return (
    <section className="preview-wrap" id="report-preview">
      <div className="preview-toolbar">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-[#55d1a3]">LIVE PREVIEW</div>
          <h2>Preview dokumen</h2>
          <p>Export menggunakan bitmap berkualitas tinggi agar PDF dan PPTX mengikuti preview.</p>
        </div>
        <div className="preview-actions">
          <span className="preview-layout-badge">2 KOLOM • MULTI-RENDERER • VIEWER v2.7.1</span>
          <label className="render-scale-control" title="Skala render bitmap saat export">
            <span>Skala render</span>
            <input
              type="number"
              min={MIN_RENDER_SCALE}
              step="0.1"
              inputMode="decimal"
              value={renderScale}
              disabled={isExporting}
              onChange={(e) => {
                const value = e.target.value
                if (value === '') {
                  setRenderScale('')
                  return
                }
                const parsed = Number.parseFloat(value)
                if (Number.isFinite(parsed) && parsed >= MIN_RENDER_SCALE) setRenderScale(parsed)
              }}
              onBlur={() => {
                if (!Number.isFinite(Number(renderScale)) || Number(renderScale) <= 0) setRenderScale(1.5)
              }}
              aria-label="Skala render bitmap"
            />
            <small>
              {Math.round(1600 * normalizedRenderScale)}×{Math.round(900 * normalizedRenderScale)} px
            </small>
          </label>
          <div className="page-counter">
            Halaman <b>{current}</b> / {total}
          </div>
          <button className="download-pptx" onClick={downloadPptx} disabled={isExporting}>
            Unduh PPTX
          </button>
          <button
            className="download-pdf"
            onClick={downloadPdf}
            disabled={isExporting}
            title="Export cepat format bitmap image"
          >
            Unduh PDF (Cepat - bitmap)
          </button>
          <button
            className="download-pdf download-pdf-native"
            onClick={downloadPdfNative}
            disabled={isExporting}
            title="Teks bisa diseleksi & dicari. Pilih 'Save as PDF' di dialog cetak browser."
            style={{ backgroundColor: '#0284c7', borderColor: '#0369a1' }}
          >
            Unduh PDF (Presisi - bisa diseleksi)
          </button>
          <button
            className="download-pdf download-pdf-foreign"
            onClick={downloadPdfForeignObject}
            disabled={isExporting}
            title="Eksperimen renderer SVG Foreign Object; layout tetap berasal dari preview HTML/CSS."
            style={{ backgroundColor: '#7c3aed', borderColor: '#6d28d9' }}
          >
            Unduh PDF (Foreign Object)
          </button>
        </div>
      </div>
      <div className="pages" ref={pagesRef}>
        {Array.from({ length: total }, (_, idx) => {
          const pageNum = idx + 1
          return (
            <RenderSinglePage
              key={pageNum}
              pageNumber={pageNum}
              data={data}
              total={total}
              onVisible={setCurrent}
              onOpen={handleOpenPage}
            />
          )
        })}
      </div>
      {selectedPageNumber !== null && (
        <PageModal
          pageNumber={selectedPageNumber}
          data={data}
          total={total}
          onClose={() => setSelectedPageNumber(null)}
        />
      )}
    </section>
  )
}
