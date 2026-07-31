import { supabase } from "@/lib/supabase";
import { safeUUID, isValidUUID } from "@/lib/utils";
import { deleteWorkerProfilePhoto, getWorkerProfilePhotoUrl } from "@/lib/image-service";
import type {
  WorkerRow,
  WorkerPositionRow,
  WorkerRoleRow,
  WorkerAssignmentRow,
  WorkerInsert,
  WorkerUpdate,
  WorkerOperationalStatus,
} from "@/types/database";

export interface WorkerWithDetails extends WorkerRow {
  position?: WorkerPositionRow | null;
  operational_status: WorkerOperationalStatus;
  total_assignments: number;
  total_steps: number;
  total_events: number;
  last_activity: string | null;
  signed_avatar_url?: string | null;
}

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

// Default master data according to PRD
export const DEFAULT_POSITIONS: WorkerPositionRow[] = [
  { position_id: "11111111-1111-4111-8111-111111111101", name: "Supervisor", description: "Pengawas operasional teknis", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111102", name: "Teknisi", description: "Pelaksana teknis utama", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111103", name: "Helper", description: "Asisten teknis lapangan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111104", name: "Engineer", description: "Insinyur sistem & kualitas", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111105", name: "QC", description: "Penjamin mutu hasil instalasi", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111106", name: "Driver", description: "Pengemudi & logistik lapangan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "11111111-1111-4111-8111-111111111107", name: "Admin", description: "Administrasi tim teknis", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

export const DEFAULT_ROLES: WorkerRoleRow[] = [
  { role_id: "role-1", name: "PIC", description: "Penanggung jawab utama step", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { role_id: "role-2", name: "Supervisor", description: "Supervisi pelaksanaan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { role_id: "role-3", name: "Teknisi", description: "Pengerjaan teknis", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { role_id: "role-4", name: "Helper", description: "Pembantu lapangan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { role_id: "role-5", name: "Observer", description: "Pengamat / Inspektur", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { role_id: "role-6", name: "Dokumentasi", description: "Pengambil foto & laporan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

const LOCAL_STORAGE_WORKERS_KEY = "ets_workers_v1";
const LOCAL_STORAGE_ASSIGNMENTS_KEY = "ets_worker_assignments_v1";

const SAMPLE_INITIAL_WORKERS: WorkerRow[] = [
  {
    worker_id: "11111111-2222-4333-8444-555555555501",
    id: "11111111-2222-4333-8444-555555555501",
    worker_code: "WKR-001",
    full_name: "Budi Santoso",
    nickname: "Budi",
    profile_image_path: null,
    profile_photo_path: null,
    phone_number: "0812-3456-7890",
    email: "budi.santoso@zanxa.studio",
    position_id: "11111111-1111-4111-8111-111111111102",
    joined_date: "2024-03-15",
    created_at: "2024-03-15T08:00:00Z",
    updated_at: "2024-03-15T08:00:00Z",
  },
  {
    worker_id: "11111111-2222-4333-8444-555555555502",
    id: "11111111-2222-4333-8444-555555555502",
    worker_code: "WKR-002",
    full_name: "Rahmat Hidayat",
    nickname: "Rahmat",
    profile_image_path: null,
    profile_photo_path: null,
    phone_number: "0813-9876-5432",
    email: "rahmat.hidayat@zanxa.studio",
    position_id: "11111111-1111-4111-8111-111111111101",
    joined_date: "2023-01-10",
    created_at: "2023-01-10T08:00:00Z",
    updated_at: "2023-01-10T08:00:00Z",
  },
  {
    worker_id: "11111111-2222-4333-8444-555555555503",
    id: "11111111-2222-4333-8444-555555555503",
    worker_code: "WKR-003",
    full_name: "Ahmad Rizky",
    nickname: "Ahmad",
    profile_image_path: null,
    profile_photo_path: null,
    phone_number: "0811-2233-4455",
    email: "ahmad.rizky@zanxa.studio",
    position_id: "11111111-1111-4111-8111-111111111104",
    joined_date: "2024-06-01",
    created_at: "2024-06-01T08:00:00Z",
    updated_at: "2024-06-01T08:00:00Z",
  },
  {
    worker_id: "11111111-2222-4333-8444-555555555504",
    id: "11111111-2222-4333-8444-555555555504",
    worker_code: "WKR-004",
    full_name: "Dedi Prasetyo",
    nickname: "Dedi",
    profile_image_path: null,
    profile_photo_path: null,
    phone_number: "0815-6677-8899",
    email: "dedi.prasetyo@zanxa.studio",
    position_id: "11111111-1111-4111-8111-111111111103",
    joined_date: "2025-02-12",
    created_at: "2025-02-12T08:00:00Z",
    updated_at: "2025-02-12T08:00:00Z",
  },
];

export function normalizeWorkerRow(raw: any): WorkerRow {
  if (!raw) {
    const defaultId = safeUUID();
    return {
      worker_id: defaultId,
      id: defaultId,
      worker_code: `WKR-${Math.floor(100 + Math.random() * 900)}`,
      full_name: "Pekerja Baru",
      name: "Pekerja Baru",
      nickname: null,
      profile_image_path: null,
      profile_photo_path: null,
      role: null,
      status: "active",
      notes: null,
      phone_number: null,
      email: null,
      position_id: "pos-2",
      joined_date: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const idVal = raw.worker_id || raw.id || safeUUID();
  const nameVal = raw.full_name || raw.name || "Pekerja";
  const rawPhoto = raw.profile_photo_path || raw.profile_image_path || null;
  const photoVal = rawPhoto ? getWorkerProfilePhotoUrl(idVal, rawPhoto) : null;

  return {
    ...raw,
    worker_id: idVal,
    id: idVal,
    full_name: nameVal,
    name: nameVal,
    profile_photo_path: photoVal,
    profile_image_path: photoVal,
    status: raw.status || "active",
    joined_date: raw.joined_date || (raw.created_at ? String(raw.created_at).split("T")[0] : new Date().toISOString().split("T")[0]),
  };
}

function getStoredWorkers(): WorkerRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WORKERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeWorkerRow);
      }
    }
  } catch (e) {
    console.error("Failed to parse stored workers:", e);
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_WORKERS_KEY, JSON.stringify(SAMPLE_INITIAL_WORKERS));
  } catch {}
  return SAMPLE_INITIAL_WORKERS.map(normalizeWorkerRow);
}

function setStoredWorkers(workers: WorkerRow[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_WORKERS_KEY, JSON.stringify(workers));
  } catch (e) {
    console.error("Failed to store workers:", e);
  }
}

function getStoredAssignments(): WorkerAssignmentDetail[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ASSIGNMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse stored worker assignments:", e);
  }
  return [];
}

function setStoredAssignments(assignments: WorkerAssignmentDetail[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch (e) {
    console.error("Failed to store worker assignments:", e);
  }
}

export async function resolveWorkerPhotoUrls(workers: WorkerRow[]): Promise<WorkerRow[]> {
  if (!workers || workers.length === 0) return [];

  return workers.map((w) => {
    const rawPath = w.profile_photo_path || w.profile_image_path;
    const resolvedUrl = getWorkerProfilePhotoUrl(w.worker_id || w.id, rawPath);
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
        // Seed default positions if table exists but is empty
        try {
          await (supabase as any).from("worker_positions").upsert(DEFAULT_POSITIONS);
        } catch {}
        return DEFAULT_POSITIONS;
      }
    } catch {}
    return DEFAULT_POSITIONS;
  },

  /**
   * Get all roles master list
   */
  async getRoles(): Promise<WorkerRoleRow[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("worker_roles")
        .select("*")
        .order("name");
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}
    return DEFAULT_ROLES;
  },

  /**
   * Get all workers with computed operational status and details
   */
  async getWorkers(): Promise<WorkerWithDetails[]> {
    const positions = await this.getPositions();
    const positionsMap = new Map(positions.map((p) => [p.position_id, p]));

    let rawWorkers: WorkerRow[] = [];

    try {
      const { data, error } = await (supabase as any)
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        rawWorkers = data.map(normalizeWorkerRow);
        // Sync local cache for offline reliability
        if (data.length > 0) {
          setStoredWorkers(rawWorkers);
        }
      } else {
        rawWorkers = getStoredWorkers();
      }
    } catch {
      rawWorkers = getStoredWorkers();
    }

    rawWorkers = await resolveWorkerPhotoUrls(rawWorkers);

    const assignments = await this.getAllAssignments();

    return rawWorkers.map((worker) => {
      const workerAssigns = assignments.filter((a) => a.worker_id === worker.worker_id || a.worker_id === worker.id);
      
      // Compute operational status: In Installation vs In Maintenance vs Inactive
      let operationalStatus: WorkerOperationalStatus = "Inactive";
      const activeAssigns = workerAssigns.filter((a) => !a.completed_at);
      if (activeAssigns.length > 0) {
        const hasInstallation = activeAssigns.some((a) => a.event_type === "installation");
        const hasMaintenance = activeAssigns.some((a) => a.event_type === "maintenance");
        if (hasInstallation) {
          operationalStatus = "In Installation";
        } else if (hasMaintenance) {
          operationalStatus = "In Maintenance";
        } else {
          operationalStatus = "In Installation";
        }
      }

      // Unique steps and events count
      const stepIds = new Set(workerAssigns.map((a) => a.step_id));
      const eventTitles = new Set(workerAssigns.map((a) => a.event_title || a.event_type));

      // Last activity timestamp
      const timestamps = workerAssigns
        .map((a) => a.assigned_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const lastActivity = timestamps.length > 0 ? timestamps[0] : worker.created_at;

      return {
        ...worker,
        position: positionsMap.get(worker.position_id || "") || null,
        operational_status: operationalStatus,
        total_assignments: workerAssigns.length,
        total_steps: stepIds.size,
        total_events: eventTitles.size,
        last_activity: lastActivity,
      };
    });
  },

  /**
   * Get single worker by ID
   */
  async getWorkerById(workerId: string): Promise<WorkerWithDetails | null> {
    const workers = await this.getWorkers();
    return workers.find((w) => w.worker_id === workerId || w.id === workerId) || null;
  },

  /**
   * Create a new worker
   */
  async createWorker(payload: Partial<WorkerInsert> & { password?: string }): Promise<WorkerRow> {
    const rawWorkerId = payload.worker_id || payload.id;
    const newWorkerId = isValidUUID(rawWorkerId) ? rawWorkerId! : safeUUID();
    const nowIso = new Date().toISOString();
    const photoPath = payload.profile_photo_path || payload.profile_image_path || null;
    const fullNameVal = payload.full_name || payload.name || "Pekerja Baru";
    const codeVal = payload.worker_code || `WKR-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve valid position_id UUID
    let posId = payload.position_id;
    if (!isValidUUID(posId)) {
      const foundPos = DEFAULT_POSITIONS.find(
        (p) => p.position_id === posId || p.name.toLowerCase() === String(posId).toLowerCase()
      );
      posId = foundPos ? foundPos.position_id : DEFAULT_POSITIONS[1].position_id;
    }

    // Ensure position exists in worker_positions table before FK check / function invoke
    try {
      const posObj = DEFAULT_POSITIONS.find((p) => p.position_id === posId) || {
        position_id: posId,
        name: "Teknisi",
        description: "Pelaksana teknis utama",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };
      await (supabase as any).from("worker_positions").upsert(posObj);
    } catch (e) {
      console.warn("Worker position pre-upsert failed:", e);
    }

    const functionBody = {
      worker_code: codeVal,
      full_name: fullNameVal,
      nickname: payload.nickname || null,
      email: payload.email || null,
      password: (payload as any).password || null,
      phone_number: payload.phone_number || null,
      position_id: posId,
      joined_date: payload.joined_date || null,
    };

    try {
      const { data, error } = await supabase.functions.invoke("create-worker-account", {
        body: functionBody,
      });

      if (error) {
        console.warn("Edge Function invoke error:", error);
        let errMsg = error.message || "";
        try {
          if (typeof (error as any).context?.json === "function") {
            const errJson = await (error as any).context.json();
            if (errJson?.message) errMsg = errJson.message;
            else if (errJson?.error) errMsg = errJson.error;
          }
        } catch {}

        const lowerMsg = errMsg.toLowerCase();
        if (
          lowerMsg.includes("email") ||
          lowerMsg.includes("already registered") ||
          lowerMsg.includes("already been registered")
        ) {
          throw new Error("Email sudah digunakan.");
        }
        if (
          lowerMsg.includes("worker_code") ||
          lowerMsg.includes("kode worker") ||
          lowerMsg.includes("workers_worker_code_key") ||
          (lowerMsg.includes("code") && lowerMsg.includes("unique"))
        ) {
          throw new Error("Kode Worker sudah digunakan.");
        }
        // If it's a network/function missing error, don't throw - fall back to DB insert!
        if (!errMsg.includes("Failed to send a request") && !errMsg.includes("FunctionsFetchError")) {
          console.warn("Edge Function failed with message, falling back to DB insert:", errMsg);
        }
      } else if (data && (data.success === false || data.error || (data.message && !data.worker))) {
        const errMsg = String(data.error || data.message || "Gagal membuat akun worker");
        console.error("Edge Function returned error in body:", errMsg);
        const lowerMsg = errMsg.toLowerCase();
        if (
          lowerMsg.includes("email") ||
          lowerMsg.includes("already registered") ||
          lowerMsg.includes("already been registered")
        ) {
          throw new Error("Email sudah digunakan.");
        }
        if (
          lowerMsg.includes("worker_code") ||
          lowerMsg.includes("kode worker") ||
          lowerMsg.includes("workers_worker_code_key") ||
          (lowerMsg.includes("code") && lowerMsg.includes("unique"))
        ) {
          throw new Error("Kode Worker sudah digunakan.");
        }
      } else if (data) {
        const workerObj = data.worker || data.data || data;
        if (workerObj && typeof workerObj === "object") {
          const normalized = normalizeWorkerRow(workerObj);
          const resolved = await resolveWorkerPhotoUrls([normalized]);
          const result = resolved[0] || normalized;

          const localWorkers = getStoredWorkers();
          setStoredWorkers([
            result,
            ...localWorkers.filter((w) => w.worker_id !== result.worker_id && w.worker_code !== result.worker_code),
          ]);
          return result;
        }
      }
    } catch (e: any) {
      console.warn("Edge Function invocation failed or threw error:", e);
      if (
        e.message === "Email sudah digunakan." ||
        e.message === "Kode Worker sudah digunakan."
      ) {
        throw e;
      }
      // For any Edge function endpoint failure, log and fall through to direct DB insert
    }

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

    const newWorker = normalizeWorkerRow({
      ...payload,
      ...dbPayload,
      id: newWorkerId,
      name: fullNameVal,
      profile_photo_path: photoPath,
      status: payload.status || "active",
      notes: payload.notes || null,
    });

    try {
      const { data, error } = await (supabase as any)
        .from("workers")
        .insert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        const normalized = normalizeWorkerRow(data);
        const resolved = await resolveWorkerPhotoUrls([normalized]);
        const result = resolved[0] || normalized;

        const localWorkers = getStoredWorkers();
        setStoredWorkers([result, ...localWorkers.filter((w) => w.worker_id !== newWorkerId && w.id !== newWorkerId)]);
        return result;
      } else if (error) {
        console.error("Supabase insert worker error:", error);
        if (error.code === "23505" || error.message?.includes("unique")) {
          if (error.message?.includes("email") || error.details?.includes("email")) {
            throw new Error("Email sudah digunakan.");
          }
          if (error.message?.includes("worker_code") || error.details?.includes("worker_code")) {
            throw new Error("Kode Worker sudah digunakan.");
          }
        }
      }
    } catch (e: any) {
      if (e.message === "Email sudah digunakan." || e.message === "Kode Worker sudah digunakan.") {
        throw e;
      }
      console.error("Database insert worker exception:", e);
    }

    // Fallback local storage update
    const localWorkers = getStoredWorkers();
    const updated = [newWorker, ...localWorkers.filter((w) => w.worker_id !== newWorkerId && w.id !== newWorkerId)];
    setStoredWorkers(updated);

    return newWorker;
  },

  /**
   * Update worker
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

    if (payload.position_id !== undefined) {
      let posId = payload.position_id;
      if (posId && !isValidUUID(posId)) {
        const foundPos = DEFAULT_POSITIONS.find(
          (p) => p.position_id === posId || p.name.toLowerCase() === String(posId).toLowerCase()
        );
        posId = foundPos ? foundPos.position_id : DEFAULT_POSITIONS[1].position_id;
      }
      if (posId) {
        dbPayload.position_id = posId;
        try {
          const posObj = DEFAULT_POSITIONS.find((p) => p.position_id === posId) || {
            position_id: posId,
            name: "Teknisi",
            description: "Pelaksana teknis utama",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          };
          await (supabase as any).from("worker_positions").upsert(posObj);
        } catch {}
      }
    }

    const updateData: Partial<WorkerRow> = {
      ...payload,
      updated_at: nowIso,
    };
    if (photoPath !== undefined) {
      updateData.profile_photo_path = photoPath;
      updateData.profile_image_path = photoPath;
    }
    if (fullNameVal !== undefined) {
      updateData.full_name = fullNameVal;
      updateData.name = fullNameVal;
    }

    try {
      let query = (supabase as any).from("workers").update(dbPayload);
      if (isValidUUID(workerId)) {
        query = query.eq("worker_id", workerId);
      } else {
        query = query.or(`worker_id.eq.${workerId},worker_code.eq.${workerId}`);
      }
      const { data, error } = await query.select().single();

      if (!error && data) {
        const normalized = normalizeWorkerRow(data);
        const resolved = await resolveWorkerPhotoUrls([normalized]);
        const result = resolved[0] || normalized;

        const localWorkers = getStoredWorkers();
        const updatedLocals = localWorkers.map((w) =>
          w.worker_id === workerId || w.id === workerId ? result : w
        );
        setStoredWorkers(updatedLocals);
        return result;
      } else if (error) {
        console.error("Supabase update worker error:", error);
      }
    } catch (e) {
      console.error("Database update worker exception:", e);
    }

    const localWorkers = getStoredWorkers();
    let found = false;
    const updated = localWorkers.map((w) => {
      if (w.worker_id === workerId || w.id === workerId) {
        found = true;
        return normalizeWorkerRow({ ...w, ...updateData });
      }
      return w;
    });

    let resultWorker: WorkerRow;
    if (found) {
      setStoredWorkers(updated);
      resultWorker = updated.find((w) => w.worker_id === workerId || w.id === workerId)!;
    } else {
      resultWorker = normalizeWorkerRow({ worker_id: workerId, id: workerId, ...updateData });
      setStoredWorkers([resultWorker, ...localWorkers]);
    }

    return resultWorker;
  },

  /**
   * Delete worker (also removes profile photo from storage so it doesn't become an orphan file)
   */
  async deleteWorker(workerId: string): Promise<void> {
    // Delete profile photo from storage bucket 'worker-profiles'
    await deleteWorkerProfilePhoto(workerId);

    try {
      let delQuery = (supabase as any).from("workers").delete();
      if (isValidUUID(workerId)) {
        delQuery = delQuery.eq("worker_id", workerId);
      } else {
        delQuery = delQuery.or(`worker_id.eq.${workerId},worker_code.eq.${workerId}`);
      }
      await delQuery;
    } catch {}

    const localWorkers = getStoredWorkers();
    const filtered = localWorkers.filter((w) => w.worker_id !== workerId && w.id !== workerId);
    setStoredWorkers(filtered);

    // Also remove worker assignments
    const assignments = getStoredAssignments();
    setStoredAssignments(assignments.filter((a) => a.worker_id !== workerId));
  },

  /**
   * Get all assignments across all steps
   */
  async getAllAssignments(): Promise<WorkerAssignmentDetail[]> {
    try {
      const { data, error } = await (supabase as any)
        .from("worker_assignments")
        .select(`
          *,
          worker:workers(*),
          role:worker_roles(*)
        `)
        .order("assigned_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}

    return getStoredAssignments();
  },

  /**
   * Get assignments for a specific step ID
   */
  async getAssignmentsByStep(stepId: string): Promise<WorkerAssignmentDetail[]> {
    const all = await this.getAllAssignments();
    return all.filter((a) => a.step_id === stepId);
  },

  /**
   * Get assignments for a list of step IDs (Event Level)
   */
  async getAssignmentsByEventSteps(stepIds: string[]): Promise<WorkerAssignmentDetail[]> {
    if (!stepIds || stepIds.length === 0) return [];
    const all = await this.getAllAssignments();
    return all.filter((a) => stepIds.includes(a.step_id));
  },

  /**
   * Assign worker to ALL steps of an Event
   */
  async assignWorkerToEventSteps(
    steps: { step_id: string; step_type?: string; title?: string }[],
    _eventId: string,
    eventTitle: string,
    eventType: "installation" | "maintenance",
    workerId: string,
    roleId: string,
    productSerial?: string,
    productName?: string
  ): Promise<WorkerAssignmentDetail[]> {
    if (!steps || steps.length === 0) {
      throw new Error("Event tidak memiliki step untuk penugasan worker.");
    }

    const results: WorkerAssignmentDetail[] = [];
    for (const step of steps) {
      try {
        const assigned = await this.assignWorkerToStep(
          step.step_id,
          workerId,
          roleId,
          {
            event_type: eventType,
            step_type: step.step_type || "installation",
            step_title: step.title || "Step",
            event_title: eventTitle,
            product_serial: productSerial,
            product_name: productName,
          }
        );
        results.push(assigned);
      } catch (err) {
        console.warn(`Notice: worker ${workerId} already assigned to step ${step.step_id}`);
      }
    }
    return results;
  },

  /**
   * Remove worker from ALL steps of an Event
   */
  async removeWorkerFromEventSteps(
    stepIds: string[],
    workerId: string
  ): Promise<void> {
    if (!stepIds || stepIds.length === 0) return;
    const all = await this.getAllAssignments();
    const toRemove = all.filter((a) => stepIds.includes(a.step_id) && a.worker_id === workerId);

    for (const a of toRemove) {
      await this.removeWorkerAssignment(a.assignment_id);
    }
  },

  /**
   * Get worker assignment history for detail timeline view
   */
  async getWorkerHistory(workerId: string): Promise<WorkerAssignmentDetail[]> {
    const all = await this.getAllAssignments();
    return all.filter((a) => a.worker_id === workerId);
  },

  /**
   * Assign worker to step with role
   */
  async assignWorkerToStep(
    stepId: string,
    workerId: string,
    roleId: string,
    context?: {
      event_type?: "installation" | "maintenance";
      step_type?: string;
      step_title?: string;
      event_title?: string;
      product_serial?: string;
      product_name?: string;
    }
  ): Promise<WorkerAssignmentDetail> {
    const existing = await this.getAssignmentsByStep(stepId);
    const isAlreadyAssigned = existing.some((a) => a.worker_id === workerId);
    if (isAlreadyAssigned) {
      throw new Error("Worker sudah ditugaskan pada step ini.");
    }

    const roles = await this.getRoles();
    const roleObj = roles.find((r) => r.role_id === roleId) || DEFAULT_ROLES[0];
    const workers = getStoredWorkers();
    const workerObj = workers.find((w) => w.worker_id === workerId) || null;

    const newAssignment: WorkerAssignmentDetail = {
      assignment_id: safeUUID(),
      step_id: stepId,
      worker_id: workerId,
      role_id: roleId,
      assigned_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      worker: workerObj,
      role: roleObj,
      event_type: context?.event_type || "installation",
      step_type: context?.step_type || "installation",
      step_title: context?.step_title || "Step",
      event_title: context?.event_title || "Event",
      product_serial: context?.product_serial || "",
      product_name: context?.product_name || "",
    };

    try {
      await (supabase as any).from("worker_assignments").insert({
        assignment_id: newAssignment.assignment_id,
        step_id: newAssignment.step_id,
        worker_id: newAssignment.worker_id,
        role_id: newAssignment.role_id,
        assigned_at: newAssignment.assigned_at,
      });
    } catch {}

    const stored = getStoredAssignments();
    setStoredAssignments([newAssignment, ...stored]);

    return newAssignment;
  },

  /**
   * Remove worker assignment from step
   */
  async removeWorkerAssignment(assignmentId: string): Promise<void> {
    try {
      await (supabase as any)
        .from("worker_assignments")
        .delete()
        .eq("assignment_id", assignmentId);
    } catch {}

    const stored = getStoredAssignments();
    setStoredAssignments(stored.filter((a) => a.assignment_id !== assignmentId));
  },
};
