import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { uploadProductStepImagePair, deleteFiles, PRODUCT_ASSETS_BUCKET, getSignedUrls, type UploadedImagePaths } from "@/lib/image-service";
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
  completed_at: string | null;
  notes: string | null;
  images: ProductStepImage[];
}

export interface ProductEventData {
  event_id: string;
  product_id: string;
  event_type: EventType;
  title: string;
  sequence_number: number;
  status: "active" | "completed";
  completed_at: string | null;
  created_at: string;
  steps: ProductStepData[];
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
 * Helper to sync event and steps directly into product_events and product_event_steps Supabase tables
 */
async function syncEventToDB(event: ProductEventData): Promise<void> {
  if (!event || !event.event_id) return;
  let activeEventId = event.event_id;

  const eventPayload: any = {
    product_id: event.product_id,
    event_type: event.event_type,
    status: event.status,
    completed_at: event.completed_at,
    created_at: event.created_at || new Date().toISOString(),
  };

  if (event.sequence_number) {
    eventPayload.sequence_number = event.sequence_number;
  }

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
    // If installation event, check if an installation event already exists for product_id
    if (event.event_type === "installation") {
      const { data: existingInst } = await (supabase as any)
        .from("product_events")
        .select("event_id")
        .eq("product_id", event.product_id)
        .eq("event_type", "installation")
        .maybeSingle();

      if (existingInst) {
        activeEventId = existingInst.event_id;
        event.event_id = existingInst.event_id;

        console.group("SUPABASE UPDATE product_events (existing installation)");
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
  }

  // 2. Sync steps
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
   * Fetch all events & steps for a product from database as single source of truth
   */
  async getProductEvents(productId: string): Promise<ProductEventData[]> {
    if (!productId) return [];

    console.group("SUPABASE SELECT product_events");
    console.log("Table: product_events");
    console.log("Params: product_id =", productId);

    let rawEvents: any[] | null = null;
    const { data: dbEvents, error } = await (supabase as any)
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

    console.log("Response:", dbEvents);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      console.error("[Supabase Error] Table: product_events | Action: SELECT (nested join) | Message:", error.message, error);

      // Step-by-step fallback query if nested join fails
      const { data: evList, error: evErr } = await supabase
        .from("product_events")
        .select("*")
        .eq("product_id", productId)
        .order("sequence_number", { ascending: true });

      if (evErr) {
        console.error("[Supabase Error] Table: product_events | Action: SELECT (fallback) | Message:", evErr.message, evErr);
        throw new Error(`Gagal mengambil data event dari database: ${evErr.message || "Database error"}`);
      }

      if (!evList || evList.length === 0) {
        return [];
      }

      const eventIds = evList.map((e: any) => e.event_id || e.id).filter(Boolean);
      const { data: stepList, error: stErr } = await supabase
        .from("product_event_steps")
        .select("*")
        .in("event_id", eventIds);

      if (stErr) {
        console.error("[Supabase Error] Table: product_event_steps | Action: SELECT (fallback) | Message:", stErr.message, stErr);
      }

      const steps = stepList || [];
      const stepIds = steps.map((s: any) => s.step_id || s.id).filter(Boolean);

      let imgList: any[] = [];
      if (stepIds.length > 0) {
        const { data: imgs, error: imgErr } = await supabase
          .from("product_images")
          .select("*")
          .in("step_id", stepIds)
          .order("sort_order", { ascending: true });

        if (imgErr) {
          console.error("[Supabase Error] Table: product_images | Action: SELECT (fallback) | Message:", imgErr.message, imgErr);
        } else {
          imgList = imgs || [];
        }
      }

      // Assemble fallback structure
      rawEvents = evList.map((e: any) => {
        const eId = e.event_id || e.id;
        const eSteps = steps
          .filter((s: any) => s.event_id === eId)
          .map((s: any) => {
            const sId = s.step_id || s.id;
            const sImgs = imgList.filter((i: any) => i.step_id === sId);
            return { ...s, images: sImgs };
          });
        return { ...e, steps: eSteps };
      });
    } else {
      rawEvents = dbEvents;
    }

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

    return rawEvents.map((e: any) => ({
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
    }));
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
   * Complete event
   */
  async completeEvent(productId: string, eventId: string): Promise<ProductEventData[]> {
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

    const updatedEvents = await this.getProductEvents(productId);
    const hasActiveMaintenance = updatedEvents.some(
      (e) => e.event_type === "maintenance" && e.status === "active"
    );
    if (!hasActiveMaintenance) {
      await productsService.updateProduct(productId, { status: "warranty" });
    }

    return updatedEvents;
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
      .eq("product_id", productId)
      .eq("event_id", activeEventId)
      .maybeSingle();

    if (evtLookupErr) {
      console.error("Error looking up event for upload:", evtLookupErr);
    }

    if (!dbEvt) {
      const { data: fallbackEvts } = await (supabase as any)
        .from("product_events")
        .select(`
          event_id,
          steps:product_event_steps(step_id, step_type)
        `)
        .eq("product_id", productId)
        .order("sequence_number", { ascending: true });

      if (fallbackEvts && fallbackEvts.length > 0) {
        dbEvt = fallbackEvts[0];
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
        const { data: existingInst } = await (supabase as any)
          .from("product_events")
          .select("event_id")
          .eq("product_id", productId)
          .eq("event_type", "installation")
          .maybeSingle();

        if (existingInst) {
          activeEventId = existingInst.event_id;
        } else {
          console.group("SUPABASE INSERT product_events");
          console.log("Table: product_events");
          const { error: newEvtErr } = await (supabase as any).from("product_events").insert({
            event_id: activeEventId,
            product_id: productId,
            event_type: "installation",
            sequence_number: 1,
            status: "active",
            created_at: new Date().toISOString(),
          });
          console.groupEnd();

          if (newEvtErr) {
            throw new Error(`Gagal membuat event di database: ${newEvtErr.message}`);
          }
        }
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
   * Delete step image
   */
  async deleteStepImage(productId: string, _eventId: string, _stepId: string, imageId: string): Promise<ProductEventData[]> {
    console.group("SUPABASE DELETE product_images");
    console.log("Table: product_images");
    console.log("imageId:", imageId);

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
