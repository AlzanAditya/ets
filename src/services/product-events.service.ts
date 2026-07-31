import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { uploadProductStepImagePair, PRODUCT_ASSETS_BUCKET, getSignedUrls } from "@/lib/image-service";
import { productsService } from "@/services/products.service";

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
  completed_at: string | null; // Timestamp recorded ONLY when step is completed
  notes: string | null;
  images: ProductStepImage[];
}

export interface ProductEventData {
  event_id: string;
  product_id: string;
  event_type: EventType;
  title: string; // e.g. "INSTALASI", "MAINTENANCE #1"
  sequence_number: number;
  status: "active" | "completed";
  completed_at: string | null; // Recorded ONLY if event and ALL sub-events are completed
  created_at: string;
  steps: ProductStepData[];
}

const STORAGE_KEY_PREFIX = "product_events_v2_";

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
    // Primary key is storage_path because storage_path is strictly unique per file asset.
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

/**
 * Helper to build default Installation event
 */
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

/**
 * Helper to build a new Maintenance event
 */
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
 * Helper to sync event and steps directly into product_events and product_event_steps Supabase tables
 */
async function syncEventToDB(event: ProductEventData): Promise<void> {
  if (!event || !event.event_id) return;
  try {
    let activeEventId = event.event_id;
    let existingEvt: any = null;

    // Check if event already exists in DB first by event_id
    const { data: byId } = await (supabase as any)
      .from("product_events")
      .select("event_id, status, sequence_number")
      .eq("event_id", activeEventId)
      .maybeSingle();

    existingEvt = byId;

    // For installation events, check if an installation event already exists in DB for this product
    if (!existingEvt && event.event_type === "installation") {
      const { data: existingInst } = await (supabase as any)
        .from("product_events")
        .select("event_id, status, sequence_number")
        .eq("product_id", event.product_id)
        .eq("event_type", "installation")
        .maybeSingle();

      if (existingInst && existingInst.event_id) {
        existingEvt = existingInst;
        activeEventId = existingInst.event_id;
        event.event_id = activeEventId;
        if (event.steps) {
          event.steps.forEach((s) => (s.event_id = activeEventId));
        }
      }
    }

    // If event is already marked 'completed' in DB, do not attempt to mutate event row
    // as DB triggers enforce "Completed event is read only."
    if (existingEvt && existingEvt.status === "completed" && event.status === "completed") {
      return;
    }

    const eventPayload: any = {
      event_id: activeEventId,
      product_id: event.product_id,
      event_type: event.event_type,
      status: event.status,
      completed_at: event.completed_at,
      created_at: event.created_at || new Date().toISOString(),
    };

    // Only include sequence_number if event does NOT exist in DB yet
    if (!existingEvt) {
      eventPayload.sequence_number = event.sequence_number;
    }

    const { error: evtErr } = await (supabase as any)
      .from("product_events")
      .upsert(eventPayload, { onConflict: "event_id" });

    if (evtErr) {
      console.warn("Notice on product_events sync:", evtErr.message || evtErr);
    }

    if (event.steps && event.steps.length > 0) {
      // Query existing steps in product_event_steps to align step_ids with DB
      const { data: existingSteps } = await (supabase as any)
        .from("product_event_steps")
        .select("step_id, step_type, status")
        .eq("event_id", activeEventId);

      const stepMap = new Map<string, { id: string; status: string }>();
      if (existingSteps && existingSteps.length > 0) {
        existingSteps.forEach((es: any) => {
          if (es.step_type && es.step_id) {
            stepMap.set(es.step_type, { id: es.step_id, status: es.status });
          }
        });

        event.steps.forEach((st) => {
          if (stepMap.has(st.step_type)) {
            st.step_id = stepMap.get(st.step_type)!.id;
          }
        });
      }

      // Filter out steps that are already completed in DB if trying to upsert completed step
      const stepsToUpsert = event.steps.filter((st) => {
        const dbStep = stepMap.get(st.step_type);
        return !(dbStep && dbStep.status === "completed" && st.status === "completed");
      });

      if (stepsToUpsert.length > 0) {
        const stepRows = stepsToUpsert.map((st, idx) => ({
          step_id: st.step_id,
          event_id: activeEventId,
          step_type: st.step_type,
          step_order: getStepSequenceNumber(st) || idx + 1,
          status: st.status,
          completed_at: st.completed_at,
          notes: st.notes,
        }));

        const { error: stepsErr } = await (supabase as any)
          .from("product_event_steps")
          .upsert(stepRows, { onConflict: "step_id" });

        if (stepsErr) {
          console.warn("Notice on product_event_steps sync:", stepsErr.message || stepsErr);
        }
      }
    }
  } catch (err) {
    console.warn("syncEventToDB non-blocking warning:", err);
  }
}

export const productEventsService = {
  /**
   * Fetch all events & steps for a product with signed image URLs.
   */
  async getProductEvents(productId: string): Promise<ProductEventData[]> {
    if (!productId) return [];

    try {
      // 1. Query Supabase product_events table if available
      let dbEvents: any[] | null = null;
      let error: any = null;

      const res1 = await (supabase as any)
        .from("product_events")
        .select(`
          *,
          steps:product_event_steps(
            *,
            images:product_images(*)
          )
        `)
        .eq("product_id", productId)
        .order("sequence_number", { ascending: true });

      dbEvents = res1.data;
      error = res1.error;

      if (!error && dbEvents && dbEvents.length > 0) {
        // Read local storage cached events to merge any recent local images
        let localEvents: ProductEventData[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PREFIX + productId);
          if (raw) localEvents = JSON.parse(raw);
        } catch {}

        // Resolve signed URLs for images
        const allPaths: string[] = [];
        dbEvents.forEach((e: any) => {
          e.steps?.forEach((s: any) => {
            s.images?.forEach((img: any) => {
              if (img.storage_path) allPaths.push(img.storage_path);
            });
          });
        });

        const signedMap = allPaths.length > 0 ? await getSignedUrls(allPaths, PRODUCT_ASSETS_BUCKET) : {};

        return dbEvents.map((e: any) => ({
          event_id: e.event_id || e.id,
          product_id: e.product_id,
          event_type: e.event_type,
          title: e.title || (e.event_type === "installation" ? "INSTALASI" : "MAINTENANCE"),
          sequence_number: e.sequence_number || 1,
          status: e.status,
          completed_at: e.completed_at,
          created_at: e.created_at,
          steps: (e.steps || [])
            .sort((a: any, b: any) => getStepSequenceNumber(a) - getStepSequenceNumber(b))
            .map((s: any) => {
              const localEvt = localEvents.find((le) => le.event_id === e.event_id || le.event_type === e.event_type);
              const localStep = localEvt?.steps?.find((ls) => ls.step_type === s.step_type || ls.step_id === s.step_id);
              const localImgs = localStep?.images || [];

              const dbImgs = (s.images || []).map((img: any) => ({
                id: img.image_id || img.id,
                storage_path: img.storage_path,
                thumbnail_path: img.thumbnail_path,
                file_name: img.file_name,
                sort_order: img.sort_order || 0,
                signedUrl: signedMap[img.storage_path] || img.thumbnail_path || img.storage_path,
              }));

              const resolvedSeq = getStepSequenceNumber(s);

              return {
                step_id: s.step_id || s.id,
                event_id: s.event_id,
                step_type: s.step_type,
                title: STEP_TYPE_LABELS[s.step_type as StepType] || s.title || s.step_type,
                sequence_number: resolvedSeq,
                status: s.status,
                completed_at: s.completed_at,
                notes: s.notes,
                images: deduplicateImages([...dbImgs, ...localImgs]),
              };
            }),
        }));
      }
    } catch (err) {
      console.warn("Database fetch for product_events failed, falling back to cached state:", err);
    }

    // 2. Fallback to localStorage state
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + productId);
      if (raw) {
        const events: ProductEventData[] = JSON.parse(raw);
        return events;
      }
    } catch (e) {
      console.error("Failed to parse product events from storage:", e);
    }

    // Initial default installation event
    const initial = [buildDefaultInstallationEvent(productId)];
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(initial));
    } catch {}
    
    // Sync initial default event to DB in background
    syncEventToDB(initial[0]);

    return initial;
  },

  /**
   * Complete step using direct DB upserts + RPC fallback + local state
   */
  async completeStep(productId: string, eventId: string, stepId: string): Promise<ProductEventData[]> {
    // Attempt RPC call first
    try {
      const { error } = await (supabase.rpc as any)("complete_step", {
        p_step_id: stepId,
      });
      if (error) {
        // Try alternative parameter name
        await (supabase.rpc as any)("complete_step", { step_id: stepId });
      }
    } catch (err) {
      console.warn("RPC complete_step invocation failed:", err);
    }

    // Update local state / cached model
    const events = await this.getProductEvents(productId);
    const nowIso = new Date().toISOString();

    const updatedEvents = events.map((event) => {
      if (event.event_id !== eventId) return event;

      // Strictly sort steps by sequence order (1, 2, 3, 4)
      const sortedSteps = [...event.steps].sort((a, b) => getStepSequenceNumber(a) - getStepSequenceNumber(b));

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
        // Unlock ONLY the immediately adjacent next step
        if (stepCompleted) {
          stepCompleted = false; // Reset immediately so we NEVER skip steps
          if (step.status === "locked" || (step.status as string) === "upcoming") {
            return {
              ...step,
              status: "active" as StepStatus,
            };
          }
        }
        return step;
      });

      return {
        ...event,
        steps: updatedSteps,
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    // Direct DB sync for product_events & product_steps
    const targetEvent = updatedEvents.find((e) => e.event_id === eventId);
    if (targetEvent) {
      await syncEventToDB(targetEvent);
    }

    return updatedEvents;
  },

  /**
   * Complete event using direct DB upserts + RPC + local state
   */
  async completeEvent(productId: string, eventId: string): Promise<ProductEventData[]> {
    try {
      const { error } = await (supabase.rpc as any)("complete_event", {
        p_event_id: eventId,
      });
      if (error) {
        await (supabase.rpc as any)("complete_event", { event_id: eventId });
      }
    } catch (err) {
      console.warn("RPC complete_event invocation failed:", err);
    }

    const events = await this.getProductEvents(productId);
    const nowIso = new Date().toISOString();

    const updatedEvents = events.map((event) => {
      if (event.event_id !== eventId) return event;

      // Verify all steps are completed
      const allStepsCompleted = event.steps.every((s) => s.status === "completed");
      if (!allStepsCompleted) {
        throw new Error("Tidak dapat menyelesaikan event karena masih ada step yang belum selesai.");
      }

      return {
        ...event,
        status: "completed" as const,
        completed_at: nowIso, // Record event completion timestamp only when entire event finishes
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    // Direct DB sync for product_events & product_steps
    const targetEvent = updatedEvents.find((e) => e.event_id === eventId);
    if (targetEvent) {
      await syncEventToDB(targetEvent);
    }

    // Check if any active maintenance events remain
    const hasActiveMaintenance = updatedEvents.some(
      (e) => e.event_type === "maintenance" && e.status === "active"
    );
    if (!hasActiveMaintenance) {
      try {
        await productsService.updateProduct(productId, { status: "warranty" });
      } catch (err) {
        console.warn("Failed to update product status to warranty in DB:", err);
      }
    }

    return updatedEvents;
  },

  /**
   * Create a new Maintenance Event for a product
   */
  async createMaintenanceEvent(productId: string): Promise<ProductEventData[]> {
    try {
      const { error } = await (supabase.rpc as any)("create_maintenance_event", {
        p_product_id: productId,
      });
      if (error) {
        await (supabase.rpc as any)("create_maintenance_event", { product_id: productId });
      }
    } catch (err) {
      console.warn("RPC create_maintenance_event failed:", err);
    }

    const events = await this.getProductEvents(productId);
    const maintenanceCount = events.filter((e) => e.event_type === "maintenance").length + 1;
    const newMaintEvent = buildNewMaintenanceEvent(productId, maintenanceCount);

    const updatedEvents = [...events, newMaintEvent];

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    // Direct DB sync for new event & steps
    await syncEventToDB(newMaintEvent);

    // Automatically set product status to maintenance
    try {
      await productsService.updateProduct(productId, { status: "maintenance" });
    } catch (err) {
      console.warn("Failed to update product status to maintenance in DB:", err);
    }

    return updatedEvents;
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

    let currentEvents = await this.getProductEvents(productId);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await this.uploadStepImage(productId, eventId, stepId, stepType, file, currentEvents);
      currentEvents = res.eventData;
    }

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(currentEvents));
    } catch {}

    return currentEvents;
  },

  /**
   * Upload image to product step gallery using bucket 'product-assets'
   * Path: product-assets/{product_id}/{event_id}/{step_type}/...
   */
  async uploadStepImage(
    productId: string,
    eventId: string,
    stepId: string,
    stepType: StepType,
    file: File,
    baseEvents?: ProductEventData[]
  ): Promise<{ eventData: ProductEventData[]; newImage: ProductStepImage }> {
    let activeStepId = stepId;
    let activeEventId = eventId;

    // 0. Resolve target event and active step ID from DB or existing state
    try {
      const currentEvents = baseEvents || (await this.getProductEvents(productId));
      const targetEvt = currentEvents.find((e) => e.event_id === eventId || e.event_type === "installation");
      if (targetEvt) {
        activeEventId = targetEvt.event_id;
        const matchedStep = targetEvt.steps?.find((s) => s.step_type === stepType || s.step_id === stepId);
        if (matchedStep && matchedStep.step_id) {
          activeStepId = matchedStep.step_id;
        }
      }
    } catch (err) {
      console.warn("Pre-upload event lookup error:", err);
    }

    // Attempt to lookup canonical IDs from DB to ensure FK compatibility
    try {
      const { data: dbEvt } = await (supabase as any)
        .from("product_events")
        .select(`
          event_id,
          steps:product_event_steps(step_id, step_type)
        `)
        .eq("product_id", productId)
        .eq("event_id", activeEventId)
        .maybeSingle();

      if (dbEvt && dbEvt.event_id) {
        activeEventId = dbEvt.event_id;
        const matchedStep = dbEvt.steps?.find((s: any) => s.step_type === stepType || s.step_id === activeStepId);
        if (matchedStep && matchedStep.step_id) {
          activeStepId = matchedStep.step_id;
        }
      }
    } catch (dbLookupErr) {
      console.warn("Notice checking canonical event/step ID in DB:", dbLookupErr);
    }

    // 1. Upload to product-assets storage with fallback
    let uploaded = { fullPath: "", thumbPath: "" };
    try {
      uploaded = await uploadProductStepImagePair(productId, activeEventId, stepType, file);
    } catch (err: any) {
      console.warn("Storage upload failed, creating fallback preview URL:", err);
      const objectUrl = URL.createObjectURL(file);
      uploaded = { fullPath: objectUrl, thumbPath: objectUrl };
    }

    // 2. Insert to product_images table in DB
    let imageId = safeUUID();
    let signedUrl = uploaded.fullPath;

    const currentSortOrder = Math.floor(Date.now() / 1000) % 1000000;

    // Ensure parent event & step row exist in DB if not already present
    try {
      const { data: stepExists } = await (supabase as any)
        .from("product_event_steps")
        .select("step_id")
        .eq("step_id", activeStepId)
        .maybeSingle();

      if (!stepExists) {
        const { data: evtExists } = await (supabase as any)
          .from("product_events")
          .select("event_id")
          .eq("event_id", activeEventId)
          .maybeSingle();

        if (!evtExists) {
          await (supabase as any).from("product_events").insert({
            event_id: activeEventId,
            product_id: productId,
            event_type: "installation",
            sequence_number: 1,
            status: "active",
            created_at: new Date().toISOString(),
          });
        }

        await (supabase as any).from("product_event_steps").insert({
          step_id: activeStepId,
          event_id: activeEventId,
          step_type: stepType,
          step_order: 1,
          status: "active",
        });
      }
    } catch (dbPrepErr) {
      console.warn("Notice preparing step DB row for image:", dbPrepErr);
    }

    try {
      const inserted = await productsService.addProductImage({
        image_id: imageId,
        step_id: activeStepId,
        product_id: productId,
        storage_path: uploaded.fullPath,
        thumbnail_path: uploaded.thumbPath,
        file_name: file.name,
        file_size: file.size,
        mime_type: "image/webp",
        sort_order: currentSortOrder,
      });
      if (inserted && inserted.image_id) {
        imageId = inserted.image_id;
      }
    } catch (err: any) {
      console.warn("Notice on product_images insert:", err?.message || err);
    }

    // Get signed URL for preview
    try {
      if (uploaded.fullPath && !uploaded.fullPath.startsWith("blob:")) {
        const signed = await getSignedUrls([uploaded.fullPath], PRODUCT_ASSETS_BUCKET);
        if (signed[uploaded.fullPath]) {
          signedUrl = signed[uploaded.fullPath];
        }
      }
    } catch {}

    const newImg: ProductStepImage = {
      id: imageId,
      storage_path: uploaded.fullPath,
      thumbnail_path: uploaded.thumbPath,
      file_name: file.name,
      sort_order: currentSortOrder,
      signedUrl: signedUrl || URL.createObjectURL(file),
    };

    // 3. Update local events state
    const events = baseEvents || (await this.getProductEvents(productId));
    const updatedEvents = events.map((e) => {
      if (e.event_id !== eventId && e.event_id !== activeEventId) return e;
      return {
        ...e,
        steps: e.steps.map((s) => {
          if (s.step_id !== stepId && s.step_id !== activeStepId && s.step_type !== stepType) return s;

          const existingIdx = s.images.findIndex(
            (img) => (img.storage_path && img.storage_path === newImg.storage_path) || (img.id && img.id === newImg.id)
          );
          let updatedImages: ProductStepImage[];
          if (existingIdx >= 0) {
            updatedImages = [...s.images];
            updatedImages[existingIdx] = {
              ...updatedImages[existingIdx],
              ...newImg,
              signedUrl: newImg.signedUrl || updatedImages[existingIdx].signedUrl,
            };
          } else {
            updatedImages = [...s.images, newImg];
          }

          return {
            ...s,
            images: deduplicateImages(updatedImages),
          };
        }),
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    return { eventData: updatedEvents, newImage: newImg };
  },

  /**
   * Delete step image
   */
  async deleteStepImage(productId: string, eventId: string, stepId: string, imageId: string): Promise<ProductEventData[]> {
    try {
      await productsService.deleteProductImage(imageId);
    } catch (err) {
      console.warn("DB delete image failed:", err);
    }

    const events = await this.getProductEvents(productId);
    const updatedEvents = events.map((e) => {
      if (e.event_id !== eventId) return e;
      return {
        ...e,
        steps: e.steps.map((s) => {
          if (s.step_id !== stepId) return s;
          return {
            ...s,
            images: s.images.filter((img) => img.id !== imageId),
          };
        }),
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    return updatedEvents;
  },

  /**
   * Reorder step images
   */
  async reorderStepImages(
    productId: string,
    eventId: string,
    stepId: string,
    reorderedImages: ProductStepImage[]
  ): Promise<ProductEventData[]> {
    const updatedWithOrders = reorderedImages.map((img, idx) => ({
      ...img,
      sort_order: idx + 1,
    }));

    try {
      await productsService.updateImageSortOrder(
        updatedWithOrders.map((i) => ({ id: i.id, sort_order: i.sort_order }))
      );
    } catch (err) {
      console.warn("Failed to sync image sort order to DB:", err);
    }

    const events = await this.getProductEvents(productId);
    const updatedEvents = events.map((e) => {
      if (e.event_id !== eventId) return e;
      return {
        ...e,
        steps: e.steps.map((s) => {
          if (s.step_id !== stepId) return s;
          return {
            ...s,
            images: updatedWithOrders,
          };
        }),
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updatedEvents));
    } catch {}

    return updatedEvents;
  },
};
