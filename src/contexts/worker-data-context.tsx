import * as React from "react"
import { useAuth } from "@/contexts/auth-context"
import { productsService } from "@/services/products.service"
import { productEventsService, type ProductEventData, STEP_TYPE_TITLES, type StepType } from "@/services/product-events.service"
import { workersService, type WorkerWithDetails } from "@/services/workers.service"
import { getClientAvatarUrl } from "@/lib/image-service"
import type { WorkerJob, StepEvent, HistoryItem, WorkerProfileData } from "@/components/worker/data/mock-worker-data"

interface WorkerDataContextType {
  loading: boolean
  worker: WorkerWithDetails | null
  workerProfile: WorkerProfileData
  currentJob: WorkerJob | null
  nextSchedules: WorkerJob[]
  allTasks: WorkerJob[]
  historyItems: HistoryItem[]
  refreshWorkerData: (silent?: boolean) => Promise<void>
  uploadStepPhotos: (productId: string, eventId: string, stepId: string, stepType: string, files: File[]) => Promise<void>
  deleteStepPhoto: (productId: string, eventId: string, stepId: string, imageId: string) => Promise<void>
  completeWorkerStep: (productId: string, eventId: string, stepId: string) => Promise<void>
}

const WorkerDataContext = React.createContext<WorkerDataContextType | undefined>(undefined)

export function WorkerDataProvider({ children }: { children: React.ReactNode }) {
  const { profile: authProfile, user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [worker, setWorker] = React.useState<WorkerWithDetails | null>(null)
  const [currentJob, setCurrentJob] = React.useState<WorkerJob | null>(null)
  const [nextSchedules, setNextSchedules] = React.useState<WorkerJob[]>([])
  const [allTasks, setAllTasks] = React.useState<WorkerJob[]>([])
  const [historyItems, setHistoryItems] = React.useState<HistoryItem[]>([])

  const loadedUserRef = React.useRef<string | null>(null)

  const loadData = React.useCallback(
    async (silent = false) => {
      if (!silent && loadedUserRef.current === null) {
        setLoading(true)
      }

      try {
        // 1. Get current worker
        const allWorkers = await workersService.getWorkers()
        let currentWorkerObj: WorkerWithDetails | null = null

        const userEmail = (authProfile?.email || user?.email || "").toLowerCase()
        if (userEmail || authProfile?.worker_code) {
          currentWorkerObj =
            allWorkers.find(
              (w) =>
                (w.email && w.email.toLowerCase() === userEmail) ||
                (w.worker_code && w.worker_code === authProfile?.worker_code)
            ) || null
        }

        if (!currentWorkerObj && (userEmail || user?.id)) {
          currentWorkerObj = {
            worker_id: authProfile?.worker_code || user?.id || "wrk-user",
            id: user?.id || "wrk-user",
            full_name: authProfile?.full_name || user?.user_metadata?.full_name || (userEmail ? userEmail.split("@")[0] : "Pekerja Lapangan"),
            email: userEmail,
            worker_code: authProfile?.worker_code || "WKR-NEW",
          } as any
        }

        setWorker(currentWorkerObj)
        const currentWorkerId = currentWorkerObj?.worker_id || currentWorkerObj?.id || ""

        // 2. Fetch assignments to check which steps belong strictly to this worker
        const allAssignments = await workersService.getAllAssignments()

        const isAssignedToCurrentWorker = (a: any) => {
          if (!currentWorkerObj) return false
          const targetWId = currentWorkerObj.worker_id || currentWorkerObj.id
          const targetWCode = currentWorkerObj.worker_code
          const targetEmail = currentWorkerObj.email?.toLowerCase()

          if (a.worker_id) {
            if (targetWId && a.worker_id === targetWId) return true
            if (targetWCode && a.worker_id === targetWCode) return true
          }
          if (a.worker) {
            if (targetWId && (a.worker.worker_id === targetWId || a.worker.id === targetWId)) return true
            if (targetWCode && a.worker.worker_code === targetWCode) return true
            if (targetEmail && a.worker.email?.toLowerCase() === targetEmail) return true
          }
          return false
        }

        const assignedStepIds = new Set<string>()
        allAssignments.forEach((a) => {
          if (isAssignedToCurrentWorker(a)) {
            assignedStepIds.add(a.step_id)
          }
        })

        // 3. Get products & product events
        const products = await productsService.getProducts({ limit: 50 })
        const activeProducts = products.filter((p) => (p.status as string) !== "retired")

        const mappedJobs: WorkerJob[] = []
        const historyList: HistoryItem[] = []

        for (const prod of activeProducts) {
          const events: ProductEventData[] = await productEventsService.getProductEvents(prod.product_id)

          for (const event of events) {
            // Check if ANY step in this event is assigned to current worker
            const hasAssignedStep = event.steps?.some((s) => assignedStepIds.has(s.step_id))

            // Check completed steps for history (only if assigned to this worker)
            event.steps?.forEach((st) => {
              if (st.status === "completed" && assignedStepIds.has(st.step_id)) {
                const isInstallation = event.event_type === "installation"
                const mainEventName = isInstallation ? "Instalasi" : "Maintenance"
                historyList.push({
                  id: st.step_id,
                  mainEvent: mainEventName,
                  stepEvent: STEP_TYPE_TITLES[st.step_type] || st.title || st.step_type,
                  clientName: prod.client?.client_name || "Klien Lapangan",
                  serialNumber: prod.serial_number,
                  address: prod.branch?.branch_name || "Lokasi Operasional",
                  dateGroup: st.completed_at
                    ? new Date(st.completed_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : "Hari Ini",
                  formattedDate: st.completed_at
                    ? new Date(st.completed_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : "Hari Ini",
                  time: st.completed_at
                    ? new Date(st.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB"
                    : "Selesai",
                  status: "completed",
                  completedAt: st.completed_at
                    ? new Date(st.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB"
                    : undefined,
                })
              }
            })

            // Only map to active tasks/jobs if event is active AND worker has assigned step
            if (event.status === "active" && hasAssignedStep) {
              const isInstallation = event.event_type === "installation"
              const mainEventName = isInstallation ? "Instalasi" : "Maintenance"

              const rawSteps = event.steps || []
              const steps: StepEvent[] = rawSteps.map((s) => ({
                id: s.step_id,
                step_type: s.step_type,
                name: STEP_TYPE_TITLES[s.step_type] || s.title || s.step_type,
                status: s.status === "completed" ? "completed" : s.status === "active" ? "active" : "upcoming",
                completedAt: s.completed_at
                  ? new Date(s.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB"
                  : undefined,
                photos: (s.images || []).map((img) => ({
                  id: img.id,
                  url: img.signedUrl || img.storage_path,
                  caption: img.file_name || undefined,
                })),
              }))

              const currentStepIndex = steps.findIndex((s) => s.status === "active")
              const activeStepIdx = currentStepIndex >= 0 ? currentStepIndex : 0

              const targetClientId = prod.client?.client_id || prod.current_client_id || ""
              const clientAvatar = targetClientId ? getClientAvatarUrl(targetClientId) : ""

              const jobItem: WorkerJob = {
                id: prod.product_id,
                eventId: event.event_id,
                mainEvent: mainEventName,
                clientName: prod.client?.client_name || "Klien Lapangan",
                clientLogo: clientAvatar,
                clientPhone: "",
                clientAddress: prod.client?.client_code ? `[${prod.client.client_code}] ${prod.client.client_name}` : "Alamat Klien Lapangan",
                location: prod.branch?.branch_name || "Lokasi Operasional",
                serialNumber: prod.serial_number,
                productName: prod.product_name,
                productCategory: prod.product_code || "General Unit",
                status: "active",
                scheduledDate: prod.created_at
                  ? new Date(prod.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                  : "Hari Ini",
                scheduledTime: "08:30 WIB",
                currentStepIndex: activeStepIdx,
                steps,
                notes: event.title ? `Event ID: ${event.title}` : undefined,
              }

              mappedJobs.push(jobItem)
            }
          }
        }

        setAllTasks(mappedJobs)

        // Active current job: first active job
        const activeJob = mappedJobs.find((j) => j.status === "active") || (mappedJobs.length > 0 ? mappedJobs[0] : null)
        setCurrentJob(activeJob)

        // Schedules: remaining jobs after current active job
        const remainingSchedules = mappedJobs.filter((j) => j.id !== activeJob?.id)
        setNextSchedules(remainingSchedules)

        setHistoryItems(historyList)
        loadedUserRef.current = currentWorkerId || "user"
      } catch (err) {
        console.error("Error loading worker data from Supabase:", err)
        setAllTasks([])
        setCurrentJob(null)
        setNextSchedules([])
        setHistoryItems([])
      } finally {
        setLoading(false)
      }
    },
    [authProfile, user]
  )

  React.useEffect(() => {
    loadData(false)
  }, [loadData])

  // Upload step photos to Supabase Storage
  const uploadStepPhotos = React.useCallback(
    async (productId: string, eventId: string, stepId: string, stepType: string, files: File[]) => {
      await productEventsService.uploadMultipleStepImages(
        productId,
        eventId,
        stepId,
        stepType as StepType,
        files
      )
      await loadData(true)
    },
    [loadData]
  )

  // Delete photo from step
  const deleteStepPhoto = React.useCallback(
    async (productId: string, eventId: string, stepId: string, imageId: string) => {
      await productEventsService.deleteStepImage(productId, eventId, stepId, imageId)
      await loadData(true)
    },
    [loadData]
  )

  // Complete step
  const completeWorkerStep = React.useCallback(
    async (productId: string, eventId: string, stepId: string) => {
      await productEventsService.completeStep(productId, eventId, stepId)
      await loadData(true)
    },
    [loadData]
  )

  const workerProfile: WorkerProfileData = React.useMemo(() => {
    const name =
      worker?.full_name ||
      worker?.name ||
      authProfile?.full_name ||
      authProfile?.name ||
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split("@")[0] : null) ||
      "Pekerja Lapangan"

    const email = worker?.email || authProfile?.email || user?.email || "-"
    const workerCode = worker?.worker_code || authProfile?.worker_code || "WKR-001"
    const phone = worker?.phone_number || authProfile?.phone_number || "-"
    const position = worker?.position?.name || authProfile?.position || "Teknisi Lapangan"
    const joinDate = worker?.joined_date
      ? new Date(worker.joined_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "01 Januari 2025"

    return {
      id: worker?.worker_id || "wrk-1",
      workerCode,
      name,
      email,
      phone,
      position,
      joinDate,
      avatarUrl: worker?.signed_avatar_url || worker?.profile_photo_path || "",
      totalTasksCompleted: historyItems.length,
      activeTasksCount: currentJob ? 1 : 0,
    }
  }, [worker, authProfile, user, historyItems, currentJob])

  const value = React.useMemo(
    () => ({
      loading,
      worker,
      workerProfile,
      currentJob,
      nextSchedules,
      allTasks,
      historyItems,
      refreshWorkerData: loadData,
      uploadStepPhotos,
      deleteStepPhoto,
      completeWorkerStep,
    }),
    [
      loading,
      worker,
      workerProfile,
      currentJob,
      nextSchedules,
      allTasks,
      historyItems,
      loadData,
      uploadStepPhotos,
      deleteStepPhoto,
      completeWorkerStep,
    ]
  )

  return <WorkerDataContext.Provider value={value}>{children}</WorkerDataContext.Provider>
}

export function useWorkerData() {
  const context = React.useContext(WorkerDataContext)
  if (!context) {
    throw new Error("useWorkerData must be used within a WorkerDataProvider")
  }
  return context
}
