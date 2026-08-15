import { useNavigate } from "react-router-dom"
import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import BeritaAcaraPdfEditor from "@/features/berita-acara/BeritaAcaraPdfEditor"

export default function BeritaAcaraPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
          <ChevronLeftIcon />
          Kembali ke Reports
        </Button>
      </div>
      <BeritaAcaraPdfEditor />
    </div>
  )
}
