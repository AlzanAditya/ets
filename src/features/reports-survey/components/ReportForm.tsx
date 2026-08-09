import * as React from 'react'
import { useState } from 'react'
import { ReportData, ProductData } from '../types'
import CropModal from './CropModal'
import { Plus, Trash2, Upload, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { SmartImage } from '@/components/ui/smart-image'

interface ReportFormProps {
  data: ReportData
  setData: React.Dispatch<React.SetStateAction<ReportData>>
  step: number
  setStep: React.Dispatch<React.SetStateAction<number>>
}

interface CropState {
  src: string
  type: 'logo' | 'photos' | 'measurementPhotos'
  i?: number
}

function Field({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground/80">{label}</label>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
      />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground/80">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-y min-h-[80px]"
      />
    </div>
  )
}

function PhotoUploader({
  title,
  photos,
  onAdd,
  onRemove,
}: {
  title: string
  photos: string[]
  onAdd: (f: File) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="mb-2">
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
        <p className="text-[11px] text-muted-foreground">
          Rasio crop 3:4 (potret). Jumlah foto boleh kurang dari slot template.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5 items-center mt-2">
        {photos.map((src, n) => {
          const resolvedSrc = /^(?:data:|blob:|https?:|\/)/.test(src) ? src : `/report-assets/${src}`
          return (
            <div key={n} className="relative w-18 h-24 rounded-lg overflow-hidden border border-border bg-muted group shadow-xs">
              <SmartImage src={resolvedSrc} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(n)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center text-xs font-bold transition-all shadow-xs"
                title="Hapus foto"
              >
                ×
              </button>
            </div>
          )
        })}
        <label className="w-18 h-24 border-2 border-dashed border-border hover:border-primary/60 rounded-lg flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition-colors bg-card hover:bg-accent/30">
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Tambah</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onAdd(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

export default function ReportForm({ data, setData, step, setStep }: ReportFormProps) {
  const [crop, setCrop] = useState<CropState | null>(null)

  const update = (k: keyof ReportData, v: any) =>
    setData((d) => ({ ...d, [k]: v }))

  const upProd = (i: number, k: keyof ProductData, v: any) =>
    setData((d) => ({
      ...d,
      products: d.products.map((p, n) => (n === i ? { ...p, [k]: v } : p)),
    }))

  const addPhoto = (i: number, type: 'photos' | 'measurementPhotos', file: File) => {
    if (file) setCrop({ src: URL.createObjectURL(file), i, type })
  }

  const steps = ['Cover & Identitas', 'Produk & Foto', 'Temuan Survey', 'Solusi', 'Review']

  return (
    <section className="builder rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-6">
      {/* Stepper Header */}
      <div className="stepper flex overflow-x-auto border-b border-border bg-muted/30 p-1">
        {steps.map((s, i) => (
          <button
            type="button"
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              i === step
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i === step ? 'bg-primary-foreground text-primary' : 'border border-border bg-background'
              }`}
            >
              {i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Step 0: Cover & Identitas */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Cover & Identitas</h2>
              <p className="text-xs text-muted-foreground">
                Atur judul, nama client, alamat, dan logo yang akan ditampilkan pada halaman cover report.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Judul laporan"
                value={data.coverTitle}
                onChange={(v) => update('coverTitle', v)}
              />
              <Field
                label="Nama client"
                value={data.clientName}
                onChange={(v) => update('clientName', v)}
              />
              <Field
                label="Subjudul"
                value={data.coverSubtitle}
                onChange={(v) => update('coverSubtitle', v)}
              />
              <Field
                label="Tanggal survey"
                value={data.surveyDate}
                onChange={(v) => update('surveyDate', v)}
              />
              <Field
                label="Lokasi survey"
                value={data.surveyLocation}
                onChange={(v) => update('surveyLocation', v)}
              />
              <Field
                label="Jenis report"
                value={data.reportType === 'final' ? 'Final Survey' : 'Survey'}
                onChange={(v) =>
                  update('reportType', v.toLowerCase().includes('final') ? 'final' : 'survey')
                }
              />
            </div>

            <TextArea
              label="Alamat client"
              value={data.address}
              onChange={(v) => update('address', v)}
            />

            <div className="p-4 border border-border rounded-lg bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-foreground">Logo client</h4>
                <p className="text-xs text-muted-foreground">
                  Upload logo client. Crop mempertahankan rasio area cover.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {data.clientLogo && (
                  <SmartImage
                    className="w-16 h-16 object-contain rounded border border-border bg-background p-1"
                    src={data.clientLogo}
                    alt="Logo Client"
                  />
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setCrop({ src: URL.createObjectURL(f), type: 'logo' })
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Produk & Foto */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Produk Survey</h2>
                <p className="text-xs text-muted-foreground">
                  Satu produk menghasilkan dua halaman report. Foto diperlakukan sebagai potret 3:4.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    products: [
                      ...d.products,
                      {
                        ...d.products[0],
                        name: 'Produk Baru',
                        photos: [],
                        measurementPhotos: [],
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Produk
              </button>
            </div>

            {data.products.map((p, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">Produk {i + 1}</h3>
                  <button
                    type="button"
                    disabled={data.products.length === 1}
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        products: d.products.filter((_, n) => n !== i),
                      }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Nama perangkat" value={p.name} onChange={(v) => upProd(i, 'name', v)} />
                  <Field label="Brand" value={p.brand} onChange={(v) => upProd(i, 'brand', v)} />
                  <Field label="Kapasitas" value={p.capacity} onChange={(v) => upProd(i, 'capacity', v)} />
                  <Field label="Phase R" value={p.phaseR} onChange={(v) => upProd(i, 'phaseR', v)} />
                  <Field label="Phase S" value={p.phaseS} onChange={(v) => upProd(i, 'phaseS', v)} />
                  <Field label="Phase T" value={p.phaseT} onChange={(v) => upProd(i, 'phaseT', v)} />
                  <Field label="Voltage" value={p.voltage} onChange={(v) => upProd(i, 'voltage', v)} />
                  <Field label="Grounding" value={p.grounding} onChange={(v) => upProd(i, 'grounding', v)} />
                  <Field label="UPS" value={p.ups} onChange={(v) => upProd(i, 'ups', v)} />
                  <Field label="Stabilizer" value={p.stabilizer} onChange={(v) => upProd(i, 'stabilizer', v)} />
                  <Field label="Proteksi power" value={p.powerProtection} onChange={(v) => upProd(i, 'powerProtection', v)} />
                  <Field label="Proteksi komunikasi" value={p.communicationProtection} onChange={(v) => upProd(i, 'communicationProtection', v)} />
                  <Field label="Load" value={p.load} onChange={(v) => upProd(i, 'load', v)} />
                </div>

                <TextArea label="Catatan" value={p.note} onChange={(v) => upProd(i, 'note', v)} />

                <PhotoUploader
                  title="Foto Perangkat / Phase"
                  photos={p.photos}
                  onAdd={(f) => addPhoto(i, 'photos', f)}
                  onRemove={(n) =>
                    upProd(
                      i,
                      'photos',
                      p.photos.filter((_, k) => k !== n)
                    )
                  }
                />

                <PhotoUploader
                  title="Foto Pengukuran"
                  photos={p.measurementPhotos}
                  onAdd={(f) => addPhoto(i, 'measurementPhotos', f)}
                  onRemove={(n) =>
                    upProd(
                      i,
                      'measurementPhotos',
                      p.measurementPhotos.filter((_, k) => k !== n)
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Temuan Survey */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Kondisi Hasil Survey</h2>
              <p className="text-xs text-muted-foreground">
                Poin-poin temuan lapangan. Baris pertama akan menjadi Judul (dicetak tebal & digarisbawahi), dan baris berikutnya adalah penjelasan detail.
              </p>
            </div>

            <div className="space-y-3">
              {data.findings.map((x, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="mt-2.5 text-xs font-bold w-5 text-center text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <textarea
                    value={x}
                    onChange={(e) =>
                      update(
                        'findings',
                        data.findings.map((v, n) => (n === i ? e.target.value : v))
                      )
                    }
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-y"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'findings',
                        data.findings.filter((_, n) => n !== i)
                      )
                    }
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1"
                    title="Hapus poin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => update('findings', [...data.findings, ''])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Temuan
            </button>
          </div>
        )}

        {/* Step 3: Solusi */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Design Solusi yang Dibutuhkan</h2>
              <p className="text-xs text-muted-foreground">
                Poin rekomendasi solusi dan penjelasan diagram untuk dimasukkan ke laporan.
              </p>
            </div>

            <div className="space-y-3">
              {data.requiredSolution.map((x, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="mt-2.5 text-xs font-bold w-5 text-center text-muted-foreground">•</span>
                  <textarea
                    value={x}
                    onChange={(e) =>
                      update(
                        'requiredSolution',
                        data.requiredSolution.map((v, n) => (n === i ? e.target.value : v))
                      )
                    }
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-y"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'requiredSolution',
                        data.requiredSolution.filter((_, n) => n !== i)
                      )
                    }
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1"
                    title="Hapus poin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => update('requiredSolution', [...data.requiredSolution, ''])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Poin Solusi
            </button>

            <hr className="border-border my-4" />

            <TextArea
              label="Penjelasan gambar"
              value={data.explanation}
              onChange={(v) => update('explanation', v)}
              rows={3}
            />
          </div>
        )}

        {/* Step 4: Review & Finalisasi */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Review & Finalisasi</h2>
              <p className="text-xs text-muted-foreground">
                Periksa kembali jumlah produk dan temuan sebelum mengunduh PDF atau PPTX.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground block">Jumlah Produk</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">
                  {data.products.length}
                </strong>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground block">Total Foto</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">
                  {data.products.reduce((a, p) => a + p.photos.length + p.measurementPhotos.length, 0)}
                </strong>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground block">Jumlah Temuan</span>
                <strong className="text-2xl font-bold text-foreground mt-1 block">
                  {data.findings.length}
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Siap untuk Mengunduh Dokumen</p>
                <p className="text-muted-foreground mt-0.5">
                  Preview di bawah adalah tampilan presisi dokumen. Gunakan toolbar preview di bagian bawah untuk mengekspor ke PDF atau PPTX.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-border">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-xs"
          >
            Selanjutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      {crop && (
        <CropModal
          src={crop.src}
          ratio={crop.type === 'logo' ? 1 : 3 / 4}
          onClose={() => setCrop(null)}
          onSave={(url) => {
            if (crop.type === 'logo') {
              update('clientLogo', url)
            } else if (crop.i !== undefined) {
              const targetIndex = crop.i
              const targetType = crop.type
              setData((d) => ({
                ...d,
                products: d.products.map((p, n) =>
                  n === targetIndex ? { ...p, [targetType]: [...p[targetType], url] } : p
                ),
              }))
            }
            setCrop(null)
          }}
        />
      )}
    </section>
  )
}
