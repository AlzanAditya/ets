import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ArrowRight,
  HardHat,
  Users,
  X,
  Calendar,
  Package,
} from "lucide-react"
import { workersService } from "@/services/workers.service"
import { clientsService } from "@/services/clients.service"
import { productsService } from "@/services/products.service"
import { supabase } from "@/lib/supabase"
import { getClientAvatarUrl, getWorkerProfilePhotoUrl } from "@/lib/image-service"

let cachedActiveWorkers: ActiveWorkerItem[] = []
let cachedActiveClients: ActiveClientItem[] = []
import { WorkerEventCard } from "@/components/worker-event-card"

function getClientInitials(name: string): string {
  if (!name || !name.trim()) return "CL"
  const cleaned = name
    .trim()
    .replace(/^(PT\.?|CV\.?|UD\.?|PD\.?|TB\.?|FIRMA)\s+/i, "")
    .trim()
  if (!cleaned) return name.slice(0, 2).toUpperCase()
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export interface ActiveWorkerEventItem {
  event_id: string
  event_type: "installation" | "maintenance"
  event_type_label: "Instalasi" | "Maintenance"
  event_title: string
  client_id?: string
  client_name: string
  product_name: string
  serial_number: string
  date: string
}

export interface ActiveWorkerItem {
  id: string
  fullName: string
  nickname: string
  positionName: string
  avatarUrl?: string | null
  eventsList: ActiveWorkerEventItem[]
}

export interface ActiveClientItem {
  id: string
  clientName: string
  clientCode: string
  avatarUrl?: string | null
  activeEventsCount: number
  eventsList: {
    event_title: string
    worker_name: string
    serial_number?: string
    date: string
  }[]
}

export function ActiveIndicatorsCards() {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"workers" | "clients">("workers")
  const [loading, setLoading] = React.useState(() => cachedActiveWorkers.length === 0 && cachedActiveClients.length === 0)
  const [activeWorkers, setActiveWorkers] = React.useState<ActiveWorkerItem[]>(() => cachedActiveWorkers)
  const [activeClients, setActiveClients] = React.useState<ActiveClientItem[]>(() => cachedActiveClients)

  const loadActiveData = React.useCallback(async () => {
    if (cachedActiveWorkers.length === 0 && cachedActiveClients.length === 0) {
      setLoading(true)
    }
    try {
      const [workers, assignments, clients, products, dbEventsRes] = await Promise.all([
        workersService.getWorkers().catch(() => []),
        workersService.getAllAssignments().catch(() => []),
        clientsService.getClients().catch(() => []),
        productsService.getProducts({ limit: 200 }).catch(() => []),
        (supabase as any).from("product_events").select("*, event_products(product_id)").then((res: any) => res, () => ({ data: null })),
      ])

      const dbEvents = dbEventsRes?.data || []
      const activeEventsMap = new Map<string, any>()
      dbEvents.forEach((evt: any) => {
        if (evt.status === "active" || !evt.completed_at) {
          activeEventsMap.set(evt.event_id, evt)
        }
      })

      // Build active workers list from real assignments and real active events
      const workersList: ActiveWorkerItem[] = []

      workers.forEach((worker: any) => {
        const workerId = worker.worker_id || worker.id
        const workerAssigns = assignments.filter(
          (a: any) => a.worker_id === workerId
        )

        const nickname =
          worker.nickname || worker.full_name?.split(" ")[0] || "Teknisi"
        const positionName = worker.position?.name || "Teknisi"

        // Group assignments strictly per event_id so multiple steps don't duplicate items
        const eventsMap = new Map<string, ActiveWorkerEventItem>()

        workerAssigns.forEach((assign: any) => {
          const eventId = assign.event_id || assign.assignment_id
          if (!eventId) return

          // If dbEvents exists, check if event is active
          const evtObj = activeEventsMap.get(eventId)
          if (activeEventsMap.size > 0 && !evtObj) {
            return // Skip completed or inactive event
          }

          if (!eventsMap.has(eventId)) {
            let clientName = ""
            let clientId = ""
            let productName = assign.product_name || ""
            let serialNumber = assign.product_serial || ""

            // Resolve product details from real database products
            const eventProdIds = (evtObj?.event_products || []).map((ep: any) => ep.product_id);
            const matchedProd = products.find(
              (p: any) =>
                (eventProdIds.includes(p.product_id)) ||
                (evtObj && p.product_id === evtObj.product_id) ||
                (serialNumber && p.serial_number === serialNumber)
            )

            if (matchedProd) {
              productName = matchedProd.product_name || productName
              serialNumber = matchedProd.serial_number || serialNumber
              if (matchedProd.client?.client_name) {
                clientName = matchedProd.client.client_name
                clientId = matchedProd.client.client_id || matchedProd.current_client_id || ""
              } else if (matchedProd.current_client_id) {
                const matchedClient = clients.find((c: any) => c.client_id === matchedProd.current_client_id)
                if (matchedClient) {
                  clientName = matchedClient.client_name
                  clientId = matchedClient.client_id
                }
              }
            }

            const rawEventType = evtObj?.event_type || assign.event_type || "installation"
            const isInstallation = rawEventType === "installation" || worker.operational_status === "In Installation"
            const eventType: "installation" | "maintenance" = isInstallation ? "installation" : "maintenance"
            const eventTypeLabel = isInstallation ? "Instalasi" : "Maintenance"

            const rawDate = evtObj?.created_at
              ? new Date(evtObj.created_at)
              : assign.assigned_at
              ? new Date(assign.assigned_at)
              : new Date()

            const formattedDate = rawDate.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })

            eventsMap.set(eventId, {
              event_id: eventId,
              event_type: eventType,
              event_type_label: eventTypeLabel,
              event_title: evtObj?.title || assign.event_title || `Project ${eventTypeLabel}`,
              client_id: clientId,
              client_name: clientName || "Klien Utama",
              product_name: productName || "Unit Perangkat",
              serial_number: serialNumber || "-",
              date: formattedDate,
            })
          }
        })

        const eventsList = Array.from(eventsMap.values())

        // STRICT FILTERING: Only include worker if they currently have active events!
        if (eventsList.length > 0) {
          const workerAvatar =
            worker.signed_avatar_url ||
            getWorkerProfilePhotoUrl(workerId, worker.profile_photo_path || worker.profile_image_path)

          workersList.push({
            id: workerId,
            fullName: worker.full_name,
            nickname,
            positionName,
            avatarUrl: workerAvatar,
            eventsList,
          })
        }
      })

      // Build active clients list from real active events
      const clientsList: ActiveClientItem[] = []

      clients.forEach((client: any) => {
        const clientId = client.client_id || client.id
        const clientNameLower = client.client_name ? client.client_name.toLowerCase() : ""

        const clientProds = products.filter((p: any) => {
          if (!p) return false
          const pClientId = p.current_client_id || p.client_id || p.client?.client_id
          if (pClientId && clientId && pClientId === clientId) return true
          if (clientNameLower && p.client?.client_name && p.client.client_name.toLowerCase() === clientNameLower) return true
          return false
        })

        const eventsMap = new Map<string, { event_title: string; worker_name: string; serial_number?: string; date: string }>()

        clientProds.forEach((prod: any) => {
          const prodSerial = prod.serial_number || (prod as any).serialNumber || (prod as any).serial_no || (prod as any).serial || ""

          // Find active events for this product from product_events
          const prodEvents = dbEvents.filter((e: any) => {
            const hasProduct = (e.event_products || []).some((ep: any) => ep.product_id === prod.product_id) || e.product_id === prod.product_id;
            return hasProduct && (e.status === "active" || !e.completed_at);
          })

          if (prodEvents.length > 0) {
            prodEvents.forEach((evt: any) => {
              if (!eventsMap.has(evt.event_id)) {
                // Find worker assigned to this event
                const assign = assignments.find((a: any) => a.event_id === evt.event_id)
                let workerName = "Tim Teknisi"
                if (assign) {
                  const assignedWorker = workers.find((w: any) => w.worker_id === assign.worker_id)
                  if (assignedWorker) {
                    workerName = assignedWorker.nickname || assignedWorker.full_name?.split(" ")[0] || "Tim Teknisi"
                  }
                }

                const rawDate = evt.created_at ? new Date(evt.created_at) : new Date()
                const formattedDate = rawDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })

                eventsMap.set(evt.event_id, {
                  event_title: evt.title || prod.product_name || "Perangkat Utama",
                  serial_number: prodSerial || evt.product_serial || evt.serial_number || "-",
                  worker_name: workerName,
                  date: formattedDate,
                })
              }
            })
          } else {
            // Check if there are assignments with product_serial matching prodSerial or product_id
            const matchingAssigns = assignments.filter(
              (a: any) => (prodSerial && a.product_serial === prodSerial) || (prod.product_id && a.product_id === prod.product_id)
            )
            if (matchingAssigns.length > 0) {
              matchingAssigns.forEach((a: any) => {
                const eventKey = a.event_id || a.assignment_id || `assign-${prod.product_id}`
                if (eventKey && !eventsMap.has(eventKey)) {
                  const assignedWorker = workers.find((w: any) => w.worker_id === a.worker_id)
                  const workerName = assignedWorker?.nickname || assignedWorker?.full_name?.split(" ")[0] || "Tim Teknisi"
                  const rawDate = a.assigned_at ? new Date(a.assigned_at) : new Date()
                  const formattedDate = rawDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })

                  eventsMap.set(eventKey, {
                    event_title: a.event_title || prod.product_name || "Perangkat Utama",
                    serial_number: prodSerial || a.product_serial || "-",
                    worker_name: workerName,
                    date: formattedDate,
                  })
                }
              })
            } else {
              // Add product directly if registered under this client
              const prodKey = `prod-${prod.product_id || prodSerial || Math.random()}`
              if (!eventsMap.has(prodKey)) {
                const rawDate = prod.created_at ? new Date(prod.created_at) : new Date()
                const formattedDate = rawDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
                eventsMap.set(prodKey, {
                  event_title: prod.product_name || "Perangkat Terpasang",
                  serial_number: prodSerial || "-",
                  worker_name: "Tim Teknisi",
                  date: formattedDate,
                })
              }
            }
          }
        })

        const eventsList = Array.from(eventsMap.values())

        if (eventsList.length > 0) {
          const clientAvatar =
            (client as any).avatar_url ||
            (client as any).avatarUrl ||
            getClientAvatarUrl(clientId) ||
            (typeof window !== "undefined"
              ? localStorage.getItem(`client_avatar_${clientId}`)
              : null)

          clientsList.push({
            id: clientId,
            clientName: client.client_name,
            clientCode: client.client_code,
            avatarUrl: clientAvatar,
            activeEventsCount: eventsList.length,
            eventsList,
          })
        }
      })

      cachedActiveWorkers = workersList
      cachedActiveClients = clientsList
      setActiveWorkers(workersList)
      setActiveClients(clientsList)
    } catch (err) {
      console.error("Gagal memuat indikator aktif:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadActiveData()
  }, [loadActiveData])

  const handleOpenDrawer = (tab: "workers" | "clients") => {
    setActiveTab(tab)
    setOpen(true)
  }

  return (
    <>
      {/* Container Cards for Pekerja Aktif & Klien Aktif */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card Pekerja Aktif */}
        <Card
          onClick={() => handleOpenDrawer("workers")}
          className="group cursor-pointer border border-border/80 hover:border-primary/50 transition-all shadow-2xs hover:shadow-sm"
        >
          <CardContent className="px-3.5 sm:px-4 py-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel className="text-sm sm:text-base font-bold cursor-pointer text-foreground group-hover:text-primary transition-colors">
                Pekerja Aktif
              </FieldLabel>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            <AvatarGroup>
              {activeWorkers.slice(0, 4).map((w) => (
                <Avatar key={w.id} className="size-9 sm:size-10">
                  {w.avatarUrl ? (
                    <AvatarImage src={w.avatarUrl} alt={w.nickname} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {w.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {activeWorkers.length > 4 && (
                <AvatarGroupCount className="size-9 sm:size-10 text-xs sm:text-sm font-bold bg-neutral-800 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 ring-2 ring-background">
                  +{activeWorkers.length - 4}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          </CardContent>
        </Card>

        {/* Card Klien Aktif */}
        <Card
          onClick={() => handleOpenDrawer("clients")}
          className="group cursor-pointer border border-border/80 hover:border-primary/50 transition-all shadow-2xs hover:shadow-sm"
        >
          <CardContent className="px-3.5 sm:px-4 py-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel className="text-sm sm:text-base font-bold cursor-pointer text-foreground group-hover:text-primary transition-colors">
                Klien Aktif
              </FieldLabel>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            <AvatarGroup>
              {activeClients.slice(0, 4).map((c) => (
                <Avatar key={c.id} className="size-9 sm:size-10">
                  {c.avatarUrl ? (
                    <AvatarImage src={c.avatarUrl} alt={c.clientName} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 font-semibold dark:text-emerald-400">
                    {getClientInitials(c.clientName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {activeClients.length > 4 && (
                <AvatarGroupCount className="size-9 sm:size-10 text-xs sm:text-sm font-bold bg-neutral-800 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 ring-2 ring-background">
                  +{activeClients.length - 4}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          </CardContent>
        </Card>
      </div>

      {/* Drawer Details Component */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-w-2xl mx-auto max-h-[85vh] flex flex-col">
          <DrawerHeader className="px-6 pt-5 pb-3 border-b text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-bold flex items-center gap-2">
                Detail Aktivitas Lapangan
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="size-8 rounded-full">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground mt-1">
              Rincian pekerja aktif dan klien yang sedang menangani atau terhubung dengan event saat ini.
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-6 overflow-y-auto space-y-4">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "workers" | "clients")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="workers" className="flex items-center gap-2 text-xs">
                  <HardHat className="size-3.5" />
                  Pekerja Aktif ({activeWorkers.length})
                </TabsTrigger>
                <TabsTrigger value="clients" className="flex items-center gap-2 text-xs">
                  <Users className="size-3.5" />
                  Klien Aktif ({activeClients.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab Content: Pekerja Aktif */}
              <TabsContent value="workers" className="mt-0">
                {loading ? (
                  <div className="space-y-3 py-4 animate-pulse">
                    <div className="h-12 bg-muted rounded-lg" />
                    <div className="h-12 bg-muted rounded-lg" />
                    <div className="h-12 bg-muted rounded-lg" />
                  </div>
                ) : activeWorkers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Tidak ada pekerja aktif saat ini.
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full space-y-2.5">
                    {activeWorkers.map((worker) => (
                      <AccordionItem
                        key={worker.id}
                        value={worker.id}
                        className="border rounded-xl px-3 bg-card transition-colors hover:border-primary/40"
                      >
                        <AccordionTrigger className="hover:no-underline py-3 text-sm font-normal">
                          <div className="flex items-center justify-between gap-2 overflow-hidden pr-2 w-full">
                            {/* Profile Pekerja & Role Badge */}
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar size="sm" className="size-8 shrink-0">
                                {worker.avatarUrl ? (
                                  <AvatarImage src={worker.avatarUrl} alt={worker.nickname} />
                                ) : null}
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                  {worker.nickname.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <span className="font-semibold text-foreground truncate max-w-[110px] sm:max-w-[160px]">
                                {worker.nickname}
                              </span>

                              {/* Badge Roles dipindahkan ke bagian atas */}
                              <Badge
                                variant="outline"
                                className="text-[11px] font-normal px-2 py-0.5 shrink-0 bg-muted/50 text-muted-foreground"
                              >
                                {worker.positionName}
                              </Badge>
                            </div>

                            {/* Teks event (instalasi/maintenance) menggantikan penugasan tugas & tanpa badge */}
                            <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground mr-1 font-medium">
                              <span className="text-foreground/80">
                                {worker.eventsList.length > 0
                                  ? Array.from(new Set(worker.eventsList.map((e) => e.event_type_label))).join(", ")
                                  : "Instalasi"}
                              </span>
                              <span className="text-[11px] text-muted-foreground/70">
                                ({worker.eventsList.length} event)
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>

                        {/* Accordion Content: Detail Event Per Pekerja */}
                        <AccordionContent className="pt-1 pb-3 px-1">
                          <div className="space-y-2.5 pl-2">
                            {worker.eventsList.map((e, idx) => (
                              <WorkerEventCard
                                key={e.event_id || idx}
                                eventId={e.event_id}
                                eventTitle={e.event_title}
                                eventType={e.event_type}
                                eventTypeLabel={e.event_type_label}
                                clientId={e.client_id}
                                clientName={e.client_name}
                                productName={e.product_name}
                                serialNumber={e.serial_number}
                                date={e.date}
                                onNavigateClient={(cId) => {
                                  setOpen(false)
                                  navigate(cId ? `/clients/${cId}` : "/clients")
                                }}
                                onNavigateProduct={(sNum) => {
                                  setOpen(false)
                                  navigate(`/products/${sNum}`)
                                }}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>

              {/* Tab Content: Klien Aktif */}
              <TabsContent value="clients" className="mt-0">
                {loading ? (
                  <div className="space-y-3 py-4 animate-pulse">
                    <div className="h-12 bg-muted rounded-lg" />
                    <div className="h-12 bg-muted rounded-lg" />
                  </div>
                ) : activeClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Tidak ada klien aktif saat ini.
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full space-y-2.5">
                    {activeClients.map((client) => (
                      <AccordionItem
                        key={client.id}
                        value={client.id}
                        className="border rounded-xl px-3 bg-card transition-colors hover:border-primary/40"
                      >
                        <AccordionTrigger className="hover:no-underline py-3 text-sm font-normal">
                          <div className="flex items-center justify-between gap-2.5 overflow-hidden pr-2 w-full">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <Avatar className="size-7 shrink-0">
                                {client.avatarUrl ? (
                                  <AvatarImage src={client.avatarUrl} alt={client.clientName} />
                                ) : null}
                                <AvatarFallback className="size-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                  {getClientInitials(client.clientName)}
                                </AvatarFallback>
                              </Avatar>

                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(evt) => {
                                  evt.stopPropagation()
                                  setOpen(false)
                                  navigate(`/clients/${client.id}`)
                                }}
                                onKeyDown={(evt) => {
                                  if (evt.key === "Enter" || evt.key === " ") {
                                    evt.stopPropagation()
                                    setOpen(false)
                                    navigate(`/clients/${client.id}`)
                                  }
                                }}
                                className="font-semibold text-foreground hover:text-primary hover:underline text-left truncate max-w-[180px] sm:max-w-[240px] cursor-pointer"
                              >
                                {client.clientName}
                              </span>

                              <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                                {client.clientCode}
                              </Badge>
                            </div>

                            <span className="text-xs text-muted-foreground font-medium shrink-0">
                              {client.eventsList.length} Perangkat
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pt-1 pb-3 px-1">
                          <div className="space-y-2 pl-2">
                            {client.eventsList.map((e, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 border border-border/40"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-foreground">
                                    {e.event_title}
                                  </span>
                                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <span>
                                      Teknisi: <strong className="font-semibold text-foreground">{e.worker_name}</strong>
                                    </span>
                                    {e.serial_number && (
                                      <button
                                        type="button"
                                        onClick={(evt) => {
                                          evt.stopPropagation()
                                          setOpen(false)
                                          navigate(`/products/${e.serial_number}`)
                                        }}
                                        className="font-mono text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                                      >
                                        <Package className="size-3 shrink-0" />
                                        <span>{e.serial_number}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-normal shrink-0 ml-3">
                                  <Calendar className="size-3 text-muted-foreground/70" />
                                  <span>{e.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

