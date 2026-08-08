import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContent } from '@/components/page-content'
import { initialReport } from '@/features/reports-survey/data/template'
import { ReportData } from '@/features/reports-survey/types'
import ReportForm from '@/features/reports-survey/components/ReportForm'
import ReportPreview from '@/features/reports-survey/components/ReportPreview'
import '@/features/reports-survey/styles/report-document.css'
import { Eye, ChevronLeft, RotateCcw } from 'lucide-react'

interface ReportSurveyPageProps {
  mode?: 'survey' | 'final'
}

export default function ReportSurveyPage({ mode = 'survey' }: ReportSurveyPageProps) {
  const navigate = useNavigate()
  const cacheKey = `report_${mode}_cache_v1`

  const cachedData = useMemo(() => {
    try {
      const saved = localStorage.getItem(cacheKey)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to read report cache from localStorage:', e)
    }
    return null
  }, [cacheKey])

  const [data, setData] = useState<ReportData>(() => {
    if (cachedData) {
      return { ...cachedData, reportType: mode }
    }
    return { ...initialReport, reportType: mode }
  })

  const [step, setStep] = useState<number>(0)

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save report cache to localStorage:', e)
    }
  }, [data, cacheKey])

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset form ke data awal?')) {
      setData({ ...initialReport, reportType: mode })
      setStep(0)
      try {
        localStorage.removeItem(cacheKey)
      } catch (e) {
        console.error('Failed to clear report cache:', e)
      }
    }
  }

  const scrollToPreview = () => {
    document.getElementById('report-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const titleText = mode === 'final' ? 'Final Survey Report' : 'Survey Report'

  return (
    <PageContent
      eyebrow="Dokumen & Analitik"
      title={titleText}
      description="Form bertahap, live preview presisi, dan ekspor bitmap PDF / PPTX."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Kembali
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-accent text-destructive hover:text-destructive transition-colors"
            title="Reset Form"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={scrollToPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            Ke Preview
          </button>
        </div>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        <ReportForm data={data} setData={setData} step={step} setStep={setStep} />
        <ReportPreview data={data} />
      </div>
    </PageContent>
  )
}
