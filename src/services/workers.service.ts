import { supabase } from "@/lib/supabase";
import { safeUUID, isValidUUID } from "@/lib/utils";
import {
  uploadWorkerProfilePhoto,
  getWorkerProfilePhotoUrl,
  deleteWorkerProfilePhoto,
} from "@/lib/image-service";
import type {
  WorkerRow,
  WorkerPositionRow,
  WorkerRoleRow,
  WorkerAssignmentRow,
  WorkerInsert,
  WorkerUpdate,
} from "@/types/database";

export interface WorkerAssignmentDetail extends WorkerAssignmentRow {
  worker?: WorkerRow | null;
  role?: WorkerRoleRow | null;
  event_type?: "installation" | "maintenance";
  step_type?: string;
  step_title?: string;
  event_title?: string;
  product_serial?: string;
  product_name?: string;
}

export type WorkerOperationalStatus = "In Installation" | "In Maintenance" | "Inactive";

export interface WorkerWithDetails extends WorkerRow {
  position?: WorkerPositionRow | null;
  operational_status?: WorkerOperationalStatus;
  active_task_count?: number;
  completed_task_count?: number;
  total_assignments?: number;
  total_steps?: number;
  total_events?: number;
  signed_avatar_url?: string;
  assignments?: WorkerAssignmentDetail[];
}

export const DEFAULT_POSITIONS: WorkerPositionRow[] = [
  {
    position_id: "e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    name: "Supervisor Teknik",
    description: "Pengawas dan penanggung jawab teknis di lapangan",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    position_id: "f2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    name: "Teknisi Utama",
    description: "Pelaksana teknis utama untuk instalasi & perawatan",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    position_id: "a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d",
    name: "Dokumentator Field",
    description: "Petugas dokumentasi dan pelaporan foto lapangan",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    position_id: "b4c5d6e7-f8a9-0b1c-2d3e-4f5a6b7c8d9e",
    name: "Staff Logistik",
    description: "Penanggung jawab pengiriman dan verifikasi barang",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function normalizeWorkerRow(raw: any): WorkerRow {
  const workerId = raw.worker_id || raw.id || safeUUID();
  const workerCode = raw.worker_code || raw.code || `WKR-${Math.floor(1000 + Math.random() * 9000)}`;
  const fullName = raw.full_name || raw.name || "Pekerja Baru";
  const photoPath = raw.profile_image_path || raw.profile_photo_path || null;

  return {
    ...raw,
    worker_id: workerId,
    id: workerId,
    worker_code: workerCode,
    full_name: fullName,
    name: fullName,
    nickname: raw.nickname || null,
    profile_image_path: photoPath,
    profile_photo_path: photoPath,
    phone_number: raw.phone_number || null,
    email: raw.email || null,
    position_id: raw.position_id || DEFAULT_POSITIONS[1].position_id,
    status: raw.status || "active",
    joined_date: raw.joined_date || (raw.created_at ? String(raw.created_at).split("T")[0] : new Date().toISOString().split("T")[0]),
  };
}

export async function resolveWorkerPhotoUrls(workers: WorkerRow[]): Promise<WorkerRow[]> {
  if (!workers || workers.length === 0) return [];

  return workers.map((w) => {
    const rawPath = w.profile_photo_path || w.profile_image_path || "";
    const resolvedUrl = getWorkerProfilePhotoUrl(w.worker_id || (w as any).id || "", rawPath);
    if (resolvedUrl) {
      return {
        ...w,
        profile_photo_path: resolvedUrl,
        profile_image_path: resolvedUrl,
      };
    }
    return w;
  });
}

export const workersService = {
  /**
   * Upload worker profile photo
   */
  async uploadWorkerPhoto(workerId: string, file: File): Promise<string> {
    return uploadWorkerProfilePhoto(workerId, file);
  },

  /**
   * Get all positions master list
   */
  async getPositions(): Promise<WorkerPositionRow[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("worker_positions")
        .select("*")
        .order("name");
      if (!error && data && data.length > 0) {
        return data;
      }
      if (!error) {
        try {
          await (supabase as any).from("worker_positions").upsert(DEFAULT_POSITIONS);
        } catch {}
        return DEFAULT_POSITIONS;
      }
    } catch (e) {
      console.error("Error fetching worker_positions:", e);
    }
    return DEFAULT_POSITIONS;
  },

  /**
   * Get all roles master list directly from database (Single source of truth)
   */
  async getRoles(): Promise<WorkerRoleRow[]> {
    console.group("SUPABASE SELECT worker_roles");
    console.log("Table: worker_roles");

    const { data, error } = await (supabase as any)
      .from("worker_roles")
      .select("*")
      .order("name");

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      console.error("Error fetching worker_roles from Supabase:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all workers with computed operational status
   */
  async getWorkers(): Promise<WorkerWithDetails[]> {
    const positions = await this.getPositions();
    const positionsMap = new Map(positions.map((p) => [p.position_id, p]));

    console.group("SUPABASE SELECT workers");
    console.log("Table: workers");

    const { data, error } = await (supabase as any)
      .from("workers")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal mengambil data worker dari database: ${error.message}`);
    }

    let rawWorkers: WorkerRow[] = (data || []).map(normalizeWorkerRow);
    rawWorkers = await resolveWorkerPhotoUrls(rawWorkers);

    const assignments = await this.getAllAssignments();

    return rawWorkers.map((worker) => {
      const workerAssigns = assignments.filter((a) => a.worker_id === worker.worker_id || a.worker_id === (worker as any).id);

      // Group assignments per unique event_id
      const eventsMap = new Map<string, WorkerAssignmentDetail>();
      const activeEventsMap = new Map<string, WorkerAssignmentDetail>();

      workerAssigns.forEach((a) => {
        const eventId = a.event_id || a.assignment_id;
        if (!eventId) return;

        if (!eventsMap.has(eventId)) {
          eventsMap.set(eventId, a);
        }

        if (!a.completed_at && !activeEventsMap.has(eventId)) {
          activeEventsMap.set(eventId, a);
        }
      });

      const uniqueEventsCount = eventsMap.size;
      const activeEventsList = Array.from(activeEventsMap.values());
      const activeTaskCount = activeEventsMap.size;
      const completedTaskCount = uniqueEventsCount - activeTaskCount;

      let operationalStatus: WorkerOperationalStatus = "Inactive";
      if (activeEventsList.length > 0) {
        const hasInstallation = activeEventsList.some((a) => a.event_type === "installation");
        operationalStatus = hasInstallation ? "In Installation" : "In Maintenance";
      }

      const posId = worker.position_id;
      const pos = posId ? (positionsMap.get(posId) || null) : null;
      const avatarUrl = worker.profile_photo_path || worker.profile_image_path || "";

      return {
        ...worker,
        position: pos,
        operational_status: operationalStatus,
        active_task_count: activeTaskCount,
        completed_task_count: completedTaskCount,
        total_assignments: uniqueEventsCount,
        total_steps: uniqueEventsCount,
        total_events: uniqueEventsCount,
        signed_avatar_url: avatarUrl,
        assignments: workerAssigns,
      };
    });
  },

  /**
   * Fetch worker details by ID
   */
  async getWorkerById(workerId: string): Promise<WorkerWithDetails | null> {
    const workers = await this.getWorkers();
    return workers.find((w) => w.worker_id === workerId || (w as any).id === workerId) || null;
  },

  /**
   * Create new worker with strict database error throwing
   */
  async createWorker(payload: Partial<WorkerInsert>): Promise<WorkerRow> {
    const newWorkerId = safeUUID();
    const nowIso = new Date().toISOString();
    const photoPath = payload.profile_photo_path || payload.profile_image_path || null;
    const fullNameVal = payload.full_name || payload.name || "Pekerja Baru";
    const codeVal = payload.worker_code || `WKR-${Math.floor(1000 + Math.random() * 9000)}`;

    let posId = payload.position_id;
    if (!isValidUUID(posId)) {
      const foundPos = DEFAULT_POSITIONS.find(
        (p) => p.position_id === posId || p.name.toLowerCase() === String(posId).toLowerCase()
      );
      posId = foundPos ? foundPos.position_id : DEFAULT_POSITIONS[1].position_id;
    }

    await this.getPositions();

    const dbPayload = {
      worker_id: newWorkerId,
      worker_code: codeVal,
      full_name: fullNameVal,
      nickname: payload.nickname || null,
      profile_image_path: photoPath,
      phone_number: payload.phone_number || null,
      email: payload.email || null,
      position_id: posId,
      joined_date: payload.joined_date || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    console.group("SUPABASE INSERT workers");
    console.log("Table: workers");
    console.log("Payload:", dbPayload);

    const { data, error } = await (supabase as any)
      .from("workers")
      .insert(dbPayload)
      .select(`*, position:worker_positions(*)`)
      .single();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        if (error.message?.includes("email") || error.details?.includes("email")) {
          throw new Error("Email sudah digunakan.");
        }
        if (error.message?.includes("worker_code") || error.details?.includes("worker_code")) {
          throw new Error("Kode Worker sudah digunakan.");
        }
      }
      throw new Error(`Gagal menyimpan worker ke database: ${error.message || error.details}`);
    }

    const normalized = normalizeWorkerRow(data);
    const resolved = await resolveWorkerPhotoUrls([normalized]);
    return resolved[0] || normalized;
  },

  /**
   * Update worker with strict database error handling
   */
  async updateWorker(workerId: string, payload: Partial<WorkerUpdate>): Promise<WorkerRow> {
    const nowIso = new Date().toISOString();
    const photoPath = payload.profile_photo_path !== undefined ? payload.profile_photo_path : payload.profile_image_path;
    const fullNameVal = payload.full_name !== undefined ? payload.full_name : payload.name;

    const dbPayload: Record<string, any> = { updated_at: nowIso };
    if (fullNameVal !== undefined) dbPayload.full_name = fullNameVal;
    if (payload.worker_code !== undefined) dbPayload.worker_code = payload.worker_code;
    if (payload.nickname !== undefined) dbPayload.nickname = payload.nickname;
    if (photoPath !== undefined) dbPayload.profile_image_path = photoPath;
    if (payload.phone_number !== undefined) dbPayload.phone_number = payload.phone_number;
    if (payload.email !== undefined) dbPayload.email = payload.email;
    if (payload.joined_date !== undefined) dbPayload.joined_date = payload.joined_date;

    if (payload.position_id !== undefined && isValidUUID(payload.position_id)) {
      dbPayload.position_id = payload.position_id;
    }

    console.group("SUPABASE UPDATE workers");
    console.log("Table: workers");
    console.log("Worker ID:", workerId);
    console.log("Payload:", dbPayload);

    let query = (supabase as any).from("workers").update(dbPayload);
    if (isValidUUID(workerId)) {
      query = query.eq("worker_id", workerId);
    } else {
      query = query.or(`worker_id.eq.${workerId},worker_code.eq.${workerId}`);
    }

    const { data, error } = await query.select(`*, position:worker_positions(*)`).single();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        if (error.message?.includes("email") || error.details?.includes("email")) {
          throw new Error("Email sudah digunakan.");
        }
        if (error.message?.includes("worker_code") || error.details?.includes("worker_code")) {
          throw new Error("Kode Worker sudah digunakan.");
        }
      }
      throw new Error(`Gagal memperbarui worker di database: ${error.message || error.details}`);
    }

    const normalized = normalizeWorkerRow(data);
    const resolved = await resolveWorkerPhotoUrls([normalized]);
    return resolved[0] || normalized;
  },

  /**
   * Delete worker with strict database error handling
   */
  async deleteWorker(workerId: string): Promise<void> {
    await deleteWorkerProfilePhoto(workerId);

    console.group("SUPABASE DELETE workers");
    console.log("Table: workers");
    console.log("Worker ID:", workerId);

    let delQuery = (supabase as any).from("workers").delete();
    if (isValidUUID(workerId)) {
      delQuery = delQuery.eq("worker_id", workerId);
    } else {
      delQuery = delQuery.or(`worker_id.eq.${workerId},worker_code.eq.${workerId}`);
    }

    const { data, error } = await delQuery.select();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menghapus worker dari database: ${error.message}`);
    }
  },

  /**
   * Get all worker assignments directly from database
   */
  async getAllAssignments(): Promise<WorkerAssignmentDetail[]> {
    console.group("SUPABASE SELECT worker_assignments");
    console.log("Table: worker_assignments");

    const { data, error } = await (supabase as any)
      .from("worker_assignments")
      .select(`
        *,
        worker:workers(*),
        role:worker_roles(*)
      `)
      .order("assigned_at", { ascending: false });

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      console.error("Error fetching worker assignments from Supabase:", error);
      throw error;
    }

    return data || [];
  },

  async getAssignmentsByEvent(eventId: string): Promise<WorkerAssignmentDetail[]> {
    if (!eventId) return [];
    const all = await this.getAllAssignments();
    return all.filter((a) => a.event_id === eventId);
  },

  async assignWorkerToEvent(
    eventId: string,
    workerId: string,
    roleId: string,
    context?: {
      event_type?: "installation" | "maintenance";
      event_title?: string;
      product_serial?: string;
      product_name?: string;
    }
  ): Promise<WorkerAssignmentDetail> {
    if (!roleId || typeof roleId !== "string" || !isValidUUID(roleId)) {
      throw new Error("Role ID tidak valid. Silakan pilih role yang valid.");
    }

    const roles = await this.getRoles();
    if (!roles || roles.length === 0) {
      throw new Error("Worker roles belum tersedia. Silakan hubungi administrator untuk mengisi master data worker roles.");
    }

    const selectedRole = roles.find((r) => r.role_id === roleId);
    if (!selectedRole) {
      throw new Error("Role yang dipilih tidak ditemukan di master data database.");
    }

    await this.getPositions();

    const { data: existingDbAssignments, error: checkErr } = await (supabase as any)
      .from("worker_assignments")
      .select("assignment_id, worker_id")
      .eq("event_id", eventId);

    if (checkErr) {
      throw new Error(`Gagal mengecek assignment di database: ${checkErr.message}`);
    }

    if (existingDbAssignments) {
      const isAlreadyAssigned = existingDbAssignments.some((a: any) => a.worker_id === workerId);
      if (isAlreadyAssigned) {
        throw new Error("Worker sudah ditugaskan pada event ini.");
      }
    }

    const workers = await this.getWorkers();
    const workerObj = workers.find((w) => w.worker_id === workerId || (w as any).id === workerId) || null;

    const assignmentId = safeUUID();
    const assignedAt = new Date().toISOString();

    const insertPayload = {
      assignment_id: assignmentId,
      event_id: eventId,
      worker_id: workerId,
      role_id: selectedRole.role_id,
      assigned_at: assignedAt,
    };

    console.group("SUPABASE INSERT worker_assignments");
    console.log("Table: worker_assignments");
    console.log("Payload:", insertPayload);

    const { data: insertedData, error: insertError } = await (supabase as any)
      .from("worker_assignments")
      .insert(insertPayload)
      .select()
      .single();

    console.log("Response:", insertedData);
    console.log("Error:", insertError);
    console.groupEnd();

    if (insertError) {
      throw new Error(`Gagal menyimpan assignment ke database: ${insertError.message || insertError.details || "Error database"}`);
    }

    return {
      assignment_id: assignmentId,
      event_id: eventId,
      worker_id: workerId,
      role_id: selectedRole.role_id,
      assigned_at: assignedAt,
      completed_at: null,
      created_at: assignedAt,
      worker: workerObj,
      role: selectedRole,
      event_type: context?.event_type || "installation",
      event_title: context?.event_title || "Event",
      product_serial: context?.product_serial || "",
      product_name: context?.product_name || "",
    };
  },

  async removeWorkerFromEvent(eventId: string, workerId: string): Promise<void> {
    if (!eventId || !workerId) return;
    console.group("SUPABASE DELETE worker_assignments");
    console.log("Table: worker_assignments");
    console.log("event_id:", eventId, "worker_id:", workerId);

    const { data, error } = await (supabase as any)
      .from("worker_assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("worker_id", workerId)
      .select();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menghapus assignment dari database: ${error.message || "Error database"}`);
    }
  },

  async getWorkerHistory(workerId: string): Promise<WorkerAssignmentDetail[]> {
    const all = await this.getAllAssignments();
    const workerAssigns = all.filter((a) => a.worker_id === workerId || (a as any).worker_id === (workerId as any));

    // Group by unique event_id
    const eventsMap = new Map<string, WorkerAssignmentDetail>();
    workerAssigns.forEach((assign) => {
      const eventKey = assign.event_id || assign.assignment_id;
      if (eventKey && !eventsMap.has(eventKey)) {
        eventsMap.set(eventKey, assign);
      }
    });

    return Array.from(eventsMap.values());
  },

  /**
   * Remove worker assignment directly by ID
   */
  async removeWorkerAssignment(assignmentId: string): Promise<void> {
    console.group("SUPABASE DELETE worker_assignments");
    console.log("Table: worker_assignments");
    console.log("assignment_id:", assignmentId);

    const { data, error } = await (supabase as any)
      .from("worker_assignments")
      .delete()
      .eq("assignment_id", assignmentId)
      .select();

    console.log("Response:", data);
    console.log("Error:", error);
    console.groupEnd();

    if (error) {
      throw new Error(`Gagal menghapus assignment dari database: ${error.message || "Error database"}`);
    }
  },
};
