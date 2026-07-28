import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
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
  { position_id: "pos-1", name: "Supervisor", description: "Pengawas operasional teknis", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-2", name: "Teknisi", description: "Pelaksana teknis utama", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-3", name: "Helper", description: "Asisten teknis lapangan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-4", name: "Engineer", description: "Insinyur sistem & kualitas", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-5", name: "QC", description: "Penjamin mutu hasil instalasi", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-6", name: "Driver", description: "Pengemudi & logistik lapangan", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { position_id: "pos-7", name: "Admin", description: "Administrasi tim teknis", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
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
    worker_id: "wkr-101",
    worker_code: "WKR-001",
    full_name: "Budi Santoso",
    nickname: "Budi",
    profile_image_path: null,
    phone_number: "0812-3456-7890",
    email: "budi.santoso@zanxa.studio",
    position_id: "pos-2",
    joined_date: "2024-03-15",
    created_at: "2024-03-15T08:00:00Z",
    updated_at: "2024-03-15T08:00:00Z",
  },
  {
    worker_id: "wkr-102",
    worker_code: "WKR-002",
    full_name: "Rahmat Hidayat",
    nickname: "Rahmat",
    profile_image_path: null,
    phone_number: "0813-9876-5432",
    email: "rahmat.hidayat@zanxa.studio",
    position_id: "pos-1",
    joined_date: "2023-01-10",
    created_at: "2023-01-10T08:00:00Z",
    updated_at: "2023-01-10T08:00:00Z",
  },
  {
    worker_id: "wkr-103",
    worker_code: "WKR-003",
    full_name: "Ahmad Rizky",
    nickname: "Ahmad",
    profile_image_path: null,
    phone_number: "0811-2233-4455",
    email: "ahmad.rizky@zanxa.studio",
    position_id: "pos-4",
    joined_date: "2024-06-01",
    created_at: "2024-06-01T08:00:00Z",
    updated_at: "2024-06-01T08:00:00Z",
  },
  {
    worker_id: "wkr-104",
    worker_code: "WKR-004",
    full_name: "Dedi Prasetyo",
    nickname: "Dedi",
    profile_image_path: null,
    phone_number: "0815-6677-8899",
    email: "dedi.prasetyo@zanxa.studio",
    position_id: "pos-3",
    joined_date: "2025-02-12",
    created_at: "2025-02-12T08:00:00Z",
    updated_at: "2025-02-12T08:00:00Z",
  },
];

function getStoredWorkers(): WorkerRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WORKERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse stored workers:", e);
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_WORKERS_KEY, JSON.stringify(SAMPLE_INITIAL_WORKERS));
  } catch {}
  return SAMPLE_INITIAL_WORKERS;
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

      if (!error && data && data.length > 0) {
        rawWorkers = data;
      } else {
        rawWorkers = getStoredWorkers();
      }
    } catch {
      rawWorkers = getStoredWorkers();
    }

    const assignments = await this.getAllAssignments();

    return rawWorkers.map((worker) => {
      const workerAssigns = assignments.filter((a) => a.worker_id === worker.worker_id);
      
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
    return workers.find((w) => w.worker_id === workerId) || null;
  },

  /**
   * Create a new worker
   */
  async createWorker(payload: Partial<WorkerInsert>): Promise<WorkerRow> {
    const newWorkerId = safeUUID();
    const nowIso = new Date().toISOString();

    const newWorker: WorkerRow = {
      worker_id: newWorkerId,
      worker_code: payload.worker_code || `WKR-${Math.floor(100 + Math.random() * 900)}`,
      full_name: payload.full_name || "Pekerja Baru",
      nickname: payload.nickname || null,
      profile_image_path: payload.profile_image_path || null,
      phone_number: payload.phone_number || null,
      email: payload.email || null,
      position_id: payload.position_id || "pos-2",
      joined_date: payload.joined_date || new Date().toISOString().split("T")[0],
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("workers")
        .insert(newWorker)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
    } catch {}

    const localWorkers = getStoredWorkers();
    const updated = [newWorker, ...localWorkers];
    setStoredWorkers(updated);

    return newWorker;
  },

  /**
   * Update worker
   */
  async updateWorker(workerId: string, payload: Partial<WorkerUpdate>): Promise<WorkerRow> {
    const nowIso = new Date().toISOString();
    const updateData = { ...payload, updated_at: nowIso };

    try {
      const { data, error } = await (supabase as any)
        .from("workers")
        .update(updateData)
        .eq("worker_id", workerId)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
    } catch {}

    const localWorkers = getStoredWorkers();
    const updated = localWorkers.map((w) => (w.worker_id === workerId ? { ...w, ...updateData } : w));
    setStoredWorkers(updated);

    return updated.find((w) => w.worker_id === workerId)!;
  },

  /**
   * Delete worker
   */
  async deleteWorker(workerId: string): Promise<void> {
    try {
      await (supabase as any).from("workers").delete().eq("worker_id", workerId);
    } catch {}

    const localWorkers = getStoredWorkers();
    const filtered = localWorkers.filter((w) => w.worker_id !== workerId);
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
