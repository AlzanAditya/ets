import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { uploadProductStepImagePair, deleteFiles, deleteImageFiles, PRODUCT_ASSETS_BUCKET, getSignedUrls, type UploadedImagePaths } from "@/lib/image-service";
import { productsService } from "@/services/products.service";
import { productWarrantiesService } from "@/services/product-warranties.service";

export type EventType = "installation" | "maintenance";
export type StepType = "delivery" | "installation" | "inspection" | "report";
export type StepStatus = "locked" | "active" | "completed";

export interface ProductStepImage {
  id: string;
  storage_path: string;
  thumbnail_path?: string | null;
  file_name?: string | null;
  sort_order: number;
  signedUrl?: string;
}

export interface ProductStepData {
  step_id: string;
  event_id: string;
  step_type: StepType;
  title: string;
  sequence_number: number;
  status: StepStatus;
  completed_at: string | null;
  notes: string | null;
  images: ProductStepImage[];
}

export interface ProductEventData {
  event_id: string;
  product_id?: string;
  product_ids?: string[];
  products?: any[];
  event_type: EventType;
  title: string;
  sequence_number: number;
  status: "scheduled" | "active" | "in_progress" | "completed" | "cancelled";
  scheduled_date?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at: string | null;
  created_at: string;
  notes?: string | null;
  steps: ProductStepData[];
  client?: any;
  worker_count?: number;
  workers?: any[];
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  delivery: "PENGIRIMAN",
  installation: "PEMASANGAN",
  inspection: "PENGECEKAN",
  report: "REPORT",
};

export const STEP_TYPE_TITLES: Record<StepType, string> = {
  delivery: "Pengiriman",
  installation: "Pemasangan",
  inspection: "Pengecekan",
  report: "Report",
};

const STEP_ORDER_MAP: Record<string, number> = {
  delivery: 1,
  installation: 2,
  inspection: 3,
  maintenance: 1,
  report: 4,
};

export function getStepSequenceNumber(s: any): number {
  if (s && typeof s.sequence_number === "number" && s.sequence_number > 0) {
    return s.sequence_number;
  }
  if (s && typeof s.step_order === "number" && s.step_order > 0) {
    return s.step_order;
  }
  if (s && s.step_type && STEP_ORDER_MAP[s.step_type]) {
    return STEP_ORDER_MAP[s.step_type];
  }
  return 99;
}

export function deduplicateImages(images: ProductStepImage[]): ProductStepImage[] {
  if (!images || images.length === 0) return [];
  const map = new Map<string, ProductStepImage>();
  images.forEach((img) => {
    const key = img.storage_path || img.id;
    if (key) {
      const existing = map.get(key);
      if (!existing) {
        map.set(key, img);
      } else {
        map.set(key, {
          ...existing,
          ...img,
          id: existing.id || img.id,
          signedUrl: img.signedUrl || existing.signedUrl,
        });
      }
    }
  });
  return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
}

export function buildDefaultInstallationEvent(productId: string): ProductEventData {
  const eventId = safeUUID();
  const createdAt = new Date().toISOString();

  return {
    event_id: eventId,
    product_id: productId,
    event_type: "installation",
    title: "INSTALASI",
    sequence_number: 1,
    status: "active",
    completed_at: null,
    created_at: createdAt,
    steps: [
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "delivery",
        title: "PENGIRIMAN",
        sequence_number: 1,
        status: "active",
        completed_at: null,
        notes: null,
        images: [],
      },
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "installation",
        title: "PEMASANGAN",
        sequence_number: 2,
        status: "locked",
        completed_at: null,
        notes: null,
        images: [],
      },
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "inspection",
        title: "PENGECEKAN",
        sequence_number: 3,
        status: "locked",
        completed_at: null,
        notes: null,
        images: [],
      },
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "report",
        title: "REPORT",
        sequence_number: 4,
        status: "locked",
        completed_at: null,
        notes: null,
        images: [],
      },
    ],
  };
}

export function buildNewMaintenanceEvent(productId: string, maintenanceCount: number): ProductEventData {
  const eventId = safeUUID();
  const createdAt = new Date().toISOString();
  const title = `MAINTENANCE #${maintenanceCount}`;

  return {
    event_id: eventId,
    product_id: productId,
    event_type: "maintenance",
    title,
    sequence_number: maintenanceCount + 1,
    status: "active",
    completed_at: null,
    created_at: createdAt,
    steps: [
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "inspection",
        title: "PENGECEKAN",
        sequence_number: 1,
        status: "active",
        completed_at: null,
        notes: null,
        images: [],
      },
      {
        step_id: safeUUID(),
        event_id: eventId,
        step_type: "report",
        title: "REPORT",
        sequence_number: 2,
        status: "locked",
        completed_at: null,
        notes: null,
        images: [],
      },
    ],
  };
}

/**
 * Helper to sync event and steps directly into product_events, event_products, and product_event_steps Supabase tables
 */
async function syncEventToDB(event: ProductEventData): Promise<void> {
  if (!event || !event.event_id) return;
  let activeEventId = event.event_id;

  const eventPayload: any = {
    event_type: event.event_type,
    status: event.status === "in_progress" ? "in_progress" : event.status,
    scheduled_at: event.scheduled_at || event.scheduled_date || null,
    started_at: event.started_at || null,
    completed_at: event.completed_at || null,
    created_at: event.created_at || new Date().toISOString(),
  };

  // 1. Check if event exists by event_id
  const { data: existingEvtById } = await (supabase as any)
    .from("product_events")
    .select("event_id")
    .eq("event_id", activeEventId)
    .maybeSingle();

  if (existingEvtById) {
    console.group("SUPABASE UPDATE product_events");
    console.log("Table: product_events");
    console.log("Payload:", eventPayload);
    const { error: evtErr } = await (supabase as any)
      .from("product_events")
      .update(eventPayload)
      .eq("event_id", activeEventId);
    console.groupEnd();

    if (evtErr) {
      throw new Error(`Gagal menyimpan event ke database: ${evtErr.message || evtErr.details || "Error database"}`);
    }
  } else {
    console.group("SUPABASE INSERT product_events");
    console.log("Table: product_events");
    console.log("Payload:", { ...eventPayload, event_id: activeEventId });
    const { error: evtErr } = await (supabase as any)
      .from("product_events")
      .insert({ ...eventPayload, event_id: activeEventId });
    console.groupEnd();

    if (evtErr) {
      throw new Error(`Gagal menyimpan event ke database: ${evtErr.message || evtErr.details || "Error database"}`);
    }
  }

  // 2. Sync event_products junction table
  const pIds: string[] = [];
  if (event.product_ids && event.product_ids.length > 0) {
    pIds.push(...event.product_ids);
  } else if (event.product_id) {
    pIds.push(event.product_id);
  }

  for (const pid of pIds) {
    if (!pid) continue;
    const { data: existingLink } = await (supabase as any)
      .from("event_products")
      .select("id")
      .eq("event_id", activeEventId)
      .eq("product_id", pid)
      .maybeSingle();

    if (!existingLink) {
      await (supabase as any).from("event_products").insert({
        id: safeUUID(),
        event_id: activeEventId,
        product_id: pid,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 3. Sync steps
  if (event.steps && event.steps.length > 0) {
    for (let idx = 0; idx < event.steps.length; idx++) {
      const st = event.steps[idx];
      const stepPayload = {
        event_id: activeEventId,
        step_type: st.step_type,
        step_order: getStepSequenceNumber(st) || idx + 1,
        status: st.status,
        completed_at: st.completed_at,
        notes: st.notes,
      };

      const { data: existingStepById } = await (supabase as any)
        .from("product_event_steps")
        .select("step_id")
        .eq("step_id", st.step_id)
        .maybeSingle();

      if (existingStepById) {
        const { error: stepErr } = await (supabase as any)
          .from("product_event_steps")
          .update(stepPayload)
          .eq("step_id", st.step_id);

        if (stepErr) {
          throw new Error(`Gagal menyimpan steps ke database: ${stepErr.message || stepErr.details || "Error database"}`);
        }
      } else {
        const { data: existingStepByType } = await (supabase as any)
          .from("product_event_steps")
          .select("step_id")
          .eq("event_id", activeEventId)
          .eq("step_type", st.step_type)
          .maybeSingle();

        if (existingStepByType) {
          st.step_id = existingStepByType.step_id;
          const { error: stepErr } = await (supabase as any)
            .from("product_event_steps")
            .update(stepPayload)
            .eq("step_id", existingStepByType.step_id);

          if (stepErr) {
            throw new Error(`Gagal menyimpan steps ke database: ${stepErr.message || stepErr.details || "Error database"}`);
          }
        } else {
          const { error: stepErr } = await (supabase as any)
            .from("product_event_steps")
            .insert({ ...stepPayload, step_id: st.step_id });

          if (stepErr) {
            throw new Error(`Gagal menyimpan steps ke database: ${stepErr.message || stepErr.details || "Error database"}`);
          }
        }
      }
    }
  }
}

export const productEventsService = {
  /**
   * Fetch all events & steps for a product from database via event_products junction table
   */
  async getProductEvents(productId: string): Promise<ProductEventData[]> {
    if (!productId) return [];

    console.group("SUPABASE SELECT product_events via event_products");
    console.log("Table: event_products -> product_events");
    console.log("Params: product_id =", productId);

    // 1. Get event IDs from event_products
    const { data: juncRows, error: juncErr } = await (supabase as any)
      .from("event_products")
      .select("event_id")
      .eq("product_id", productId);

    if (juncErr) {
      console.error("[Supabase Error] Table: event_products | Action: SELECT | Message:", juncErr.message);
    }

    const eventIds = (juncRows || []).map((j: any) => j.event_id).filter(Boolean);

    let rawEvents: any[] = [];
    if (eventIds.length > 0) {
      const { data: dbEvents, error: evErr } = await (supabase as any)
        .from("product_events")
        .select(`
          *,
          steps:product_event_steps(
            *,
            images:product_images(*)
          ),
          event_products:event_products(
            product_id,
            product:products(*)
          )
        `)
        .in("event_id", eventIds)
        .order("created_at", { ascending: true });

      if (evErr) {
        console.error("[Supabase Error] Table: product_events | Action: SELECT (in eventIds) | Message:", evErr.message);
        // Fallback manual query
        const { data: evList } = await supabase
          .from("product_events")
          .select("*")
          .in("event_id", eventIds);

        const evs = evList || [];
        const { data: stepList } = await supabase
          .from("product_event_steps")
          .select("*")
          .in("event_id", eventIds);

        const steps = stepList || [];
        const stepIds = steps.map((s: any) => s.step_id).filter(Boolean);

        const { data: epList } = await (supabase as any)
          .from("event_products")
          .select("event_id, product_id, product:products(*)")
          .in("event_id", eventIds);

        let imgList: any[] = [];
        if (stepIds.length > 0) {
          const { data: imgs } = await supabase
            .from("product_images")
            .select("*")
            .in("step_id", stepIds)
            .order("sort_order", { ascending: true });
          imgList = imgs || [];
        }

        rawEvents = evs.map((e: any) => {
          const eId = e.event_id || e.id;
          const eSteps = steps
            .filter((s: any) => s.event_id === eId)
            .map((s: any) => {
              const sId = s.step_id || s.id;
              const sImgs = imgList.filter((i: any) => i.step_id === sId);
              return { ...s, images: sImgs };
            });
          const eEventProducts = (epList || []).filter((ep: any) => ep.event_id === eId);
          return { ...e, steps: eSteps, event_products: eEventProducts };
        });
      } else {
        rawEvents = dbEvents || [];
      }
    }

    console.log("Found events:", rawEvents.length);
    console.groupEnd();

    if (!rawEvents || rawEvents.length === 0) {
      const defaultEvt = buildDefaultInstallationEvent(productId);
      syncEventToDB(defaultEvt).catch((e) => console.warn("Failed to auto-sync default installation event:", e));
      rawEvents = [defaultEvt];
    }

    const allPaths: string[] = [];
    rawEvents.forEach((e: any) => {
      e.steps?.forEach((s: any) => {
        s.images?.forEach((img: any) => {
          if (img.storage_path) allPaths.push(img.storage_path);
        });
      });
    });

    const signedMap = allPaths.length > 0 ? await getSignedUrls(allPaths, PRODUCT_ASSETS_BUCKET) : {};

    return rawEvents.map((e: any) => {
      const linkedProducts = (e.event_products || [])
        .map((ep: any) => ep.product)
        .filter(Boolean);
      const linkedProductIds = (e.event_products || [])
        .map((ep: any) => ep.product_id)
        .filter(Boolean);

      return {
        event_id: e.event_id || e.id,
        product_id: productId,
        product_ids: linkedProductIds.length > 0 ? linkedProductIds : [productId],
        products: linkedProducts,
        event_type: e.event_type,
        title: e.title || (e.event_type === "installation" ? "INSTALASI" : "MAINTENANCE"),
        sequence_number: e.sequence_number || 1,
        status: e.status,
        completed_at: e.completed_at,
        created_at: e.created_at,
        steps: (e.steps || [])
          .sort((a: any, b: any) => getStepSequenceNumber(a) - getStepSequenceNumber(b))
          .map((s: any) => {
            const dbImgs = (s.images || []).map((img: any) => ({
              id: img.image_id || img.id,
              storage_path: img.storage_path,
              thumbnail_path: img.thumbnail_path,
              file_name: img.file_name,
              sort_order: img.sort_order || 0,
              signedUrl: signedMap[img.storage_path] || img.thumbnail_path || img.storage_path,
            }));

            return {
              step_id: s.step_id || s.id,
              event_id: s.event_id,
              step_type: s.step_type,
              title: STEP_TYPE_LABELS[s.step_type as StepType] || s.title || s.step_type,
              sequence_number: getStepSequenceNumber(s),
              status: s.status,
              completed_at: s.completed_at,
              notes: s.notes,
              images: deduplicateImages(dbImgs),
            };
          }),
      };
    });
  },

  /**
   * Fetch all events across the whole system with linked products, client details, step progress, and worker assignments.
   */
  async getAllEvents(params: {
    client_id?: string;
    event_type?: EventType;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ events: ProductEventData[]; totalCount: number }> {
    const { client_id, event_type, status, search, limit = 50, offset = 0 } = params;

    let query = (supabase as any)
      .from("product_events")
      .select(
        `
        event_id,
        event_type,
        status,
        scheduled_at,
        started_at,
        completed_at,
        created_at,
        event_products (
          product:products (
            product_id,
            serial_number,
            product_code,
            product_name,
            status,
            client:clients (
              client_id,
              client_name,
              client_code
            )
          )
        ),
        product_event_steps (
          step_id,
          step_type,
          step_order,
          status,
          completed_at,
          notes
        ),
        worker_assignments (
          worker:workers (
            worker_id,
            worker_code,
            full_name,
            phone_number,
            profile_image_path
          )
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (event_type) {
      query = query.eq("event_type", event_type);
    }

    if (status && status !== "all") {
      if (status === "active" || status === "in_progress") {
        query = query.or("status.eq.active,status.eq.in_progress");
      } else {
        query = query.eq("status", status);
      }
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Failed to query product_events:", error);
      return { events: [], totalCount: 0 };
    }

    let parsedEvents: ProductEventData[] = (data || []).map((row: any) => {
      const linkedProducts: any[] = [];
      let foundClient: any = null;

      if (row.event_products && Array.isArray(row.event_products)) {
        for (const ep of row.event_products) {
          if (ep.product) {
            linkedProducts.push(ep.product);
            if (!foundClient && ep.product.client) {
              foundClient = ep.product.client;
            }
          }
        }
      }

      const rawSteps = row.product_event_steps || [];
      const steps: ProductStepData[] = rawSteps
        .map((s: any) => ({
          step_id: s.step_id,
          event_id: row.event_id,
          step_type: s.step_type as StepType,
          title: STEP_TYPE_LABELS[s.step_type as StepType] || s.step_type,
          sequence_number: s.step_order || 1,
          status: s.status as StepStatus,
          completed_at: s.completed_at || null,
          notes: s.notes || null,
          images: [],
        }))
        .sort((a: ProductStepData, b: ProductStepData) => a.sequence_number - b.sequence_number);

      const workers = (row.worker_assignments || [])
        .map((wa: any) => {
          if (!wa.worker) return null;
          return {
            ...wa.worker,
            name: wa.worker.full_name || wa.worker.name,
            phone: wa.worker.phone_number || wa.worker.phone,
          };
        })
        .filter(Boolean);

      const isInst = row.event_type === "installation";
      const title = isInst ? "INSTALASI" : "MAINTENANCE";

      return {
        event_id: row.event_id,
        product_id: linkedProducts[0]?.product_id || "",
        product_ids: linkedProducts.map((p) => p.product_id),
        products: linkedProducts,
        event_type: row.event_type,
        title,
        sequence_number: 1,
        status: row.status,
        scheduled_date: row.scheduled_at || row.scheduled_date,
        scheduled_at: row.scheduled_at || row.scheduled_date,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
        notes: (row.product_event_steps && row.product_event_steps[0]?.notes) || row.notes || null,
        steps,
        client: foundClient,
        worker_count: workers.length,
        workers,
      };
    });

    // Client-side filtering if client_id or search supplied
    if (client_id && client_id !== "all") {
      parsedEvents = parsedEvents.filter((e) => e.client?.client_id === client_id);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      parsedEvents = parsedEvents.filter((e) => {
        const clientMatch = e.client?.client_name?.toLowerCase().includes(q);
        const titleMatch = e.title?.toLowerCase().includes(q);
        const notesMatch = e.notes?.toLowerCase().includes(q);
        const productMatch = (e.products || []).some(
          (p) =>
            p.serial_number?.toLowerCase().includes(q) ||
            p.product_name?.toLowerCase().includes(q) ||
            p.product_code?.toLowerCase().includes(q)
        );
        return clientMatch || titleMatch || notesMatch || productMatch;
      });
    }

    return {
      events: parsedEvents,
      totalCount: count ?? parsedEvents.length,
    };
  },

  /**
   * Create a new Event with multiple products linked.
   * - Restricts installation to 'pending' products.
   * - Restricts maintenance to 'warranty' products.
   * - If status === 'scheduled', does NOT mutate product status yet.
   * - If status === 'active', mutates product status to installation/maintenance.
   */
  async createMultiProductEvent(payload: {
    product_ids: string[];
    event_type: EventType;
    title?: string;
    scheduled_date?: string | null;
    scheduled_at?: string | null;
    is_scheduled?: boolean;
    status?: "scheduled" | "active" | "in_progress";
    notes?: string | null;
  }): Promise<ProductEventData> {
    if (!payload.product_ids || payload.product_ids.length === 0) {
      throw new Error("Pilih minimal satu produk untuk membuat event.");
    }

    const isInst = payload.event_type === "installation";
    const eventId = safeUUID();
    const createdAt = new Date().toISOString();
    const scheduleDate = payload.scheduled_date || payload.scheduled_at || null;
    const isScheduled = payload.is_scheduled ?? (Boolean(scheduleDate) && payload.status === "scheduled");
    const initialStatus = isScheduled ? "scheduled" : "active";

    const title = payload.title || (isInst ? "INSTALASI" : "MAINTENANCE");

    const newEvent: ProductEventData = {
      event_id: eventId,
      product_id: payload.product_ids[0] || "",
      product_ids: payload.product_ids,
      event_type: payload.event_type,
      title,
      sequence_number: 1,
      status: initialStatus,
      scheduled_date: scheduleDate,
      scheduled_at: scheduleDate,
      started_at: initialStatus === "active" ? createdAt : null,
      completed_at: null,
      created_at: createdAt,
      notes: payload.notes || null,
      steps: isInst
        ? [
            { step_id: safeUUID(), event_id: eventId, step_type: "delivery", title: "PENGIRIMAN", sequence_number: 1, status: initialStatus === "active" ? "active" : "locked", completed_at: null, notes: null, images: [] },
            { step_id: safeUUID(), event_id: eventId, step_type: "installation", title: "PEMASANGAN", sequence_number: 2, status: "locked", completed_at: null, notes: null, images: [] },
            { step_id: safeUUID(), event_id: eventId, step_type: "inspection", title: "PENGECEKAN", sequence_number: 3, status: "locked", completed_at: null, notes: null, images: [] },
            { step_id: safeUUID(), event_id: eventId, step_type: "report", title: "REPORT", sequence_number: 4, status: "locked", completed_at: null, notes: null, images: [] },
          ]
        : [
            { step_id: safeUUID(), event_id: eventId, step_type: "inspection", title: "PENGECEKAN", sequence_number: 1, status: initialStatus === "active" ? "active" : "locked", completed_at: null, notes: null, images: [] },
            { step_id: safeUUID(), event_id: eventId, step_type: "report", title: "REPORT", sequence_number: 2, status: "locked", completed_at: null, notes: null, images: [] },
          ],
    };

    await syncEventToDB(newEvent);

    // Only update product status if event is active immediately (NOT when scheduled)
    if (initialStatus === "active") {
      const targetProductStatus = isInst ? "installation" : "maintenance";
      for (const pid of payload.product_ids) {
        try {
          await productsService.updateProduct(pid, { status: targetProductStatus });
        } catch (updateErr) {
          console.warn(`Failed to update product ${pid} status to ${targetProductStatus}:`, updateErr);
        }
      }
    }

    return newEvent;
  },

  /**
   * Start a scheduled event: transitions event to active and updates linked products' status.
   */
  async startScheduledEvent(eventId: string): Promise<void> {
    const nowIso = new Date().toISOString();

    // 1. Fetch event
    const { data: eventRow, error: evtErr } = await (supabase as any)
      .from("product_events")
      .select("*, event_products(product_id)")
      .eq("event_id", eventId)
      .single();

    if (evtErr || !eventRow) {
      throw new Error(`Event tidak ditemukan: ${evtErr?.message || "Unknown error"}`);
    }

    // 2. Update event status to active
    await (supabase as any)
      .from("product_events")
      .update({
        status: "active",
        started_at: nowIso,
      })
      .eq("event_id", eventId);

    // Unlock first step if locked
    const { data: steps } = await (supabase as any)
      .from("product_event_steps")
      .select("*")
      .eq("event_id", eventId)
      .order("step_order", { ascending: true });

    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      if (firstStep.status === "locked" || firstStep.status === "pending") {
        await (supabase as any)
          .from("product_event_steps")
          .update({ status: "active" })
          .eq("step_id", firstStep.step_id);
      }
    }

    // 3. Update all linked products status
    const productIds: string[] = (eventRow.event_products || []).map((ep: any) => ep.product_id).filter(Boolean);
    const targetStatus = eventRow.event_type === "installation" ? "installation" : "maintenance";

    for (const pid of productIds) {
      try {
        await productsService.updateProduct(pid, { status: targetStatus });
      } catch (err) {
        console.warn(`Failed to update product ${pid} status on event start:`, err);
      }
    }
  },

  /**
   * Cancel an event and revert linked products to their previous lifecycle state.
   */
  async cancelEvent(eventId: string, _reason?: string): Promise<void> {
    const { data: eventRow, error: evtErr } = await (supabase as any)
      .from("product_events")
      .select("*, event_products(product_id)")
      .eq("event_id", eventId)
      .single();

    if (evtErr || !eventRow) {
      throw new Error(`Event tidak ditemukan: ${evtErr?.message || "Unknown error"}`);
    }

    await (supabase as any)
      .from("product_events")
      .update({
        status: "cancelled",
      })
      .eq("event_id", eventId);

    // If event was in progress / active, revert product status
    if (eventRow.status === "active" || eventRow.status === "in_progress") {
      const productIds: string[] = (eventRow.event_products || []).map((ep: any) => ep.product_id).filter(Boolean);
      const revertStatus = eventRow.event_type === "installation" ? "pending" : "warranty";

      for (const pid of productIds) {
        try {
          await productsService.updateProduct(pid, { status: revertStatus });
        } catch (err) {
          console.warn(`Failed to revert product ${pid} status on cancel:`, err);
        }
      }
    }
  },

  /**
   * Helper for Admin/Worker: Ensures an installation event exists for a product in DB.
   * Only to be called during admin/worker write operations.
   */
  async ensureInstallationEvent(productId: string): Promise<ProductEventData[]> {
    const events = await this.getProductEvents(productId);
    if (events.length === 0) {
      const defaultEvt = buildDefaultInstallationEvent(productId);
      await syncEventToDB(defaultEvt);
      return this.getProductEvents(productId);
    }
    return events;
  },

  /**
   * Complete step using direct DB upserts
   */
  async completeStep(productId: string, eventId: string, stepId: string): Promise<ProductEventData[]> {
    const events = await this.getProductEvents(productId);
    const nowIso = new Date().toISOString();

    const targetEvent = events.find((e) => e.event_id === eventId);
    if (!targetEvent) {
      throw new Error("Event tidak ditemukan");
    }

    const sortedSteps = [...targetEvent.steps].sort((a, b) => getStepSequenceNumber(a) - getStepSequenceNumber(b));
    let stepCompleted = false;

    const updatedSteps = sortedSteps.map((step) => {
      if (step.step_id === stepId) {
        stepCompleted = true;
        return {
          ...step,
          status: "completed" as StepStatus,
          completed_at: nowIso,
        };
      }
      if (stepCompleted) {
        stepCompleted = false;
        if (step.status === "locked" || (step.status as string) === "upcoming") {
          return {
            ...step,
            status: "active" as StepStatus,
          };
        }
      }
      return step;
    });

    const updatedEvent: ProductEventData = {
      ...targetEvent,
      steps: updatedSteps,
    };

    await syncEventToDB(updatedEvent);
    return this.getProductEvents(productId);
  },

  /**
   * Complete event:
   * - Sets completed_at
   * - Marks status "completed"
   * - If installation: creates initial warranty in product_warranties if warrantyData is provided,
   *   and transitions all linked products to "warranty".
   * - If maintenance: transitions all linked products back to "warranty".
   */
  async completeEvent(
    productId: string,
    eventId: string,
    warrantyData?: {
      start_date: string;
      end_date: string;
      duration_months?: number | null;
      notes?: string | null;
    }
  ): Promise<ProductEventData[]> {
    const events = await this.getProductEvents(productId);
    const nowIso = new Date().toISOString();

    const targetEvent = events.find((e) => e.event_id === eventId);
    if (!targetEvent) {
      throw new Error("Event tidak ditemukan");
    }

    const allStepsCompleted = targetEvent.steps.every((s) => s.status === "completed");
    if (!allStepsCompleted) {
      throw new Error("Tidak dapat menyelesaikan event karena masih ada step yang belum selesai.");
    }

    const updatedEvent: ProductEventData = {
      ...targetEvent,
      status: "completed",
      completed_at: nowIso,
    };

    await syncEventToDB(updatedEvent);

    // Fetch all linked products for this event
    const { data: linkedRows } = await (supabase as any)
      .from("event_products")
      .select("product_id")
      .eq("event_id", eventId);

    const allProductIds: string[] = Array.from(
      new Set([
        productId,
        ...(linkedRows || []).map((r: any) => r.product_id).filter(Boolean),
        ...(targetEvent.product_ids || []),
      ])
    );

    // If installation, handle initial warranty creation for each product
    if (targetEvent.event_type === "installation" && warrantyData && warrantyData.start_date && warrantyData.end_date) {
      for (const pId of allProductIds) {
        try {
          await productWarrantiesService.createInitialWarranty({
            product_id: pId,
            start_date: warrantyData.start_date,
            end_date: warrantyData.end_date,
            duration_months: warrantyData.duration_months ?? null,
            notes: warrantyData.notes ?? null,
          });
        } catch (wErr) {
          console.warn(`Failed to create initial warranty record for product ${pId}:`, wErr);
        }
      }
    }

    // Update status to "warranty" for all linked products
    for (const pId of allProductIds) {
      try {
        await productsService.updateProduct(pId, { status: "warranty" });
      } catch (pErr) {
        console.warn(`Failed to update product ${pId} status to warranty:`, pErr);
      }
    }

    return this.getProductEvents(productId);
  },

  /**
   * Create a new Maintenance Event for a product
   */
  async createMaintenanceEvent(productId: string): Promise<ProductEventData[]> {
    const events = await this.getProductEvents(productId);
    const maintenanceCount = events.filter((e) => e.event_type === "maintenance").length + 1;
    const newMaintEvent = buildNewMaintenanceEvent(productId, maintenanceCount);

    await syncEventToDB(newMaintEvent);
    await productsService.updateProduct(productId, { status: "maintenance" });

    return this.getProductEvents(productId);
  },

  /**
   * Batch upload multiple files to step gallery
   */
  async uploadMultipleStepImages(
    productId: string,
    eventId: string,
    stepId: string,
    stepType: StepType,
    files: File[]
  ): Promise<ProductEventData[]> {
    if (!files || files.length === 0) return this.getProductEvents(productId);

    for (let i = 0; i < files.length; i++) {
      await this.uploadStepImage(productId, eventId, stepId, stepType, files[i]);
    }

    return this.getProductEvents(productId);
  },

  /**
   * Upload image to product step gallery
   */
  async uploadStepImage(
    productId: string,
    eventId: string,
    stepId: string,
    stepType: StepType,
    file: File
  ): Promise<{ eventData: ProductEventData[]; newImage: ProductStepImage }> {
    let activeStepId = stepId;
    let activeEventId = eventId;

    let { data: dbEvt, error: evtLookupErr } = await (supabase as any)
      .from("product_events")
      .select(`
        event_id,
        steps:product_event_steps(step_id, step_type)
      `)
      .eq("event_id", activeEventId)
      .maybeSingle();

    if (evtLookupErr) {
      console.error("Error looking up event for upload:", evtLookupErr);
    }

    if (!dbEvt) {
      // Find event via event_products
      const { data: juncEvt } = await (supabase as any)
        .from("event_products")
        .select(`
          event:product_events(
            event_id,
            steps:product_event_steps(step_id, step_type)
          )
        `)
        .eq("product_id", productId)
        .maybeSingle();

      if (juncEvt && juncEvt.event) {
        dbEvt = juncEvt.event;
      }
    }

    if (dbEvt && dbEvt.event_id) {
      activeEventId = dbEvt.event_id;
      const matchedStep = dbEvt.steps?.find((s: any) => s.step_type === stepType || s.step_id === activeStepId);
      if (matchedStep && matchedStep.step_id) {
        activeStepId = matchedStep.step_id;
      }
    }

    const { data: stepExists, error: stepCheckErr } = await (supabase as any)
      .from("product_event_steps")
      .select("step_id")
      .eq("step_id", activeStepId)
      .maybeSingle();

    if (stepCheckErr) {
      throw new Error(`Gagal memeriksa step di database: ${stepCheckErr.message}`);
    }

    if (!stepExists) {
      const { data: evtExists } = await (supabase as any)
        .from("product_events")
        .select("event_id")
        .eq("event_id", activeEventId)
        .maybeSingle();

      if (!evtExists) {
        console.group("SUPABASE INSERT product_events");
        console.log("Table: product_events");
        const { error: newEvtErr } = await (supabase as any).from("product_events").insert({
          event_id: activeEventId,
          event_type: "installation",
          sequence_number: 1,
          status: "active",
          created_at: new Date().toISOString(),
        });
        console.groupEnd();

        if (newEvtErr) {
          throw new Error(`Gagal membuat event di database: ${newEvtErr.message}`);
        }

        // Link product in event_products
        await (supabase as any).from("event_products").insert({
          id: safeUUID(),
          event_id: activeEventId,
          product_id: productId,
          created_at: new Date().toISOString(),
        });
      }

      const { data: existingStepByType } = await (supabase as any)
        .from("product_event_steps")
        .select("step_id")
        .eq("event_id", activeEventId)
        .eq("step_type", stepType)
        .maybeSingle();

      if (existingStepByType) {
        activeStepId = existingStepByType.step_id;
      } else {
        console.group("SUPABASE INSERT product_event_steps");
        console.log("Table: product_event_steps");
        const { error: newStepErr } = await (supabase as any).from("product_event_steps").insert({
          step_id: activeStepId,
          event_id: activeEventId,
          step_type: stepType,
          step_order: 1,
          status: "active",
        });
        console.groupEnd();

        if (newStepErr) {
          throw new Error(`Gagal membuat step di database: ${newStepErr.message}`);
        }
      }
    }

    // Upload to storage with strict error handling
    console.group("SUPABASE STORAGE UPLOAD");
    console.log("Bucket:", PRODUCT_ASSETS_BUCKET);
    console.log("Path:", `${productId}/${activeEventId}/${stepType}`);
    console.log("File:", file.name, file.size, file.type);

    let uploaded: UploadedImagePaths & { width: number; height: number };
    try {
      uploaded = await uploadProductStepImagePair(productId, activeEventId, stepType, file);
      console.log("Response:", uploaded);
      console.log("Error: null");
    } catch (err: any) {
      console.log("Response: null");
      console.log("Error:", err);
      console.groupEnd();
      throw new Error(`Gagal mengunggah foto ke storage: ${err.message || "Storage error"}`);
    }
    console.groupEnd();

    // Insert metadata to product_images in DB
    const imageId = safeUUID();
    const currentSortOrder = Math.floor(Date.now() / 1000) % 1000000;

    const imagePayload = {
      image_id: imageId,
      step_id: activeStepId,
      storage_path: uploaded.fullPath,
      thumbnail_path: uploaded.thumbPath,
      file_name: file.name,
      file_size: file.size,
      mime_type: "image/webp",
      sort_order: currentSortOrder,
    };

    console.group("SUPABASE INSERT product_images");
    console.log("Table: product_images");
    console.log("Payload:", imagePayload);

    const { data: insertedImg, error: imgErr } = await (supabase as any)
      .from("product_images")
      .insert(imagePayload)
      .select()
      .single();

    console.log("Response:", insertedImg);
    console.log("Error:", imgErr);
    console.groupEnd();

    if (imgErr) {
      // Rollback uploaded files from storage
      try {
        await deleteFiles([uploaded.fullPath, uploaded.thumbPath], PRODUCT_ASSETS_BUCKET);
      } catch (cleanupErr) {
        console.error("Failed to delete storage files during rollback:", cleanupErr);
      }
      throw new Error(`Gagal menyimpan data foto ke database: ${imgErr.message || "Database insert error"}`);
    }

    let signedUrl = uploaded.fullPath;
    try {
      const signed = await getSignedUrls([uploaded.fullPath], PRODUCT_ASSETS_BUCKET);
      if (signed[uploaded.fullPath]) {
        signedUrl = signed[uploaded.fullPath];
      }
    } catch {}

    const newImg: ProductStepImage = {
      id: insertedImg?.image_id || imageId,
      storage_path: uploaded.fullPath,
      thumbnail_path: uploaded.thumbPath,
      file_name: file.name,
      sort_order: currentSortOrder,
      signedUrl,
    };

    const freshEvents = await this.getProductEvents(productId);
    return { eventData: freshEvents, newImage: newImg };
  },

  /**
   * Delete step image and remove associated files from storage
   */
  async deleteStepImage(
    productId: string,
    _eventId: string,
    _stepId: string,
    imageId: string,
    storagePath?: string,
    thumbnailPath?: string
  ): Promise<ProductEventData[]> {
    console.group("SUPABASE DELETE product_images");
    console.log("Table: product_images");
    console.log("imageId:", imageId);

    // 1. If paths not explicitly provided, query image record first
    let fullPath = storagePath;
    let thumbPath = thumbnailPath;

    if (!fullPath || !thumbPath) {
      try {
        const { data: imgRow } = await (supabase as any)
          .from("product_images")
          .select("storage_path, thumbnail_path")
          .eq("image_id", imageId)
          .maybeSingle();

        if (imgRow) {
          if (!fullPath && imgRow.storage_path) fullPath = imgRow.storage_path;
          if (!thumbPath && imgRow.thumbnail_path) thumbPath = imgRow.thumbnail_path;
        }
      } catch (fetchErr) {
        console.warn("Could not query image paths before delete:", fetchErr);
      }
    }

    // 2. Delete physical storage files (full + thumbnail)
    try {
      await deleteImageFiles(fullPath, thumbPath, PRODUCT_ASSETS_BUCKET);
    } catch (storageErr) {
      console.warn("Failed to remove storage files, proceeding with DB deletion:", storageErr);
    }

    // 3. Delete database record
    const { data, error } = await (supabase as any)
      .from("product_images")
      .delete()
      .eq("image_id", imageId)
      .select();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menghapus foto dari database: ${error.message}`);
    }

    return this.getProductEvents(productId);
  },

  /**
   * Reorder step images
   */
  async reorderStepImages(
    productId: string,
    _eventId: string,
    _stepId: string,
    reorderedImages: ProductStepImage[]
  ): Promise<ProductEventData[]> {
    const updates = reorderedImages.map((img, idx) => ({
      id: img.id,
      sort_order: idx + 1,
    }));

    console.group("SUPABASE UPDATE product_images (reorder)");
    console.log("Table: product_images");
    console.log("Payload:", updates);

    try {
      await productsService.updateImageSortOrder(updates);
      console.log("Response: success");
      console.log("Error: null");
      console.groupEnd();
    } catch (err: any) {
      console.log("Response: null");
      console.log("Error:", err);
      console.groupEnd();
      throw new Error(`Gagal memperbarui urutan foto di database: ${err.message}`);
    }

    return this.getProductEvents(productId);
  },
};
