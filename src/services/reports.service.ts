import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { optimizeImage } from "@/lib/image-optimizer";
import type {
  ReportTypeRow,
  ReportRow,
  ReportImageRow,
  ReportFileRow,
  ReportStatus,
} from "@/types/database";

export const REPORT_ASSETS_BUCKET = "report-assets";

export interface ReportImageWithUrl extends ReportImageRow {
  publicUrl: string;
  thumbUrl: string;
  image_id?: string;
  id?: string;
}

export interface ReportFileWithUrl extends ReportFileRow {
  publicUrl: string;
  file_id?: string;
  id?: string;
}

export interface ReportWithRelations extends ReportRow {
  report_type?: ReportTypeRow | null;
  images: ReportImageWithUrl[];
  files: ReportFileWithUrl[];
}

// ─── Storage Path & URL Helpers ───────────────────────────────────────────────

/**
 * Generate standardized storage paths for report images
 * Pattern: {event_id}/{report_id}/images/full/{uuid}.webp
 *          {event_id}/{report_id}/images/thumbs/{uuid}_thumb.webp
 */
export function buildReportImagePath(
  eventId: string,
  reportId: string,
  uuid: string,
  variant: "full" | "thumbs" = "full"
): string {
  const filename = variant === "full" ? `${uuid}.webp` : `${uuid}_thumb.webp`;
  return `${eventId}/${reportId}/images/${variant}/${filename}`;
}

/**
 * Generate standardized storage path for report attachment files
 * Pattern: {event_id}/{report_id}/files/{uuid}_{nama-file-asli}
 */
export function buildReportFilePath(
  eventId: string,
  reportId: string,
  uuid: string,
  originalFilename: string
): string {
  // Sanitize filename to avoid slashes or weird characters
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${eventId}/${reportId}/files/${uuid}_${sanitized}`;
}

/**
 * Get public URL for any asset stored in report-assets bucket
 */
export function getReportAssetPublicUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return "";
  const { data } = supabase.storage.from(REPORT_ASSETS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl || "";
}

// ─── Reports Service ─────────────────────────────────────────────────────────

export const reportsService = {
  /**
   * Fetch master report types ordered by sort_order
   */
  async getReportTypes(): Promise<ReportTypeRow[]> {
    const { data, error } = await supabase
      .from("report_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Supabase Error] Table: report_types | Action: SELECT | Message:", error.message);
      // Fallback default types if table is empty or error
      return [
        { report_type_id: "1", code: "survey", name: "Survey", has_data: true, has_images: false, has_files: false, field_schema: null, sort_order: 1, is_active: true },
        { report_type_id: "2", code: "final_survey", name: "Final Survey", has_data: true, has_images: false, has_files: false, field_schema: null, sort_order: 2, is_active: true },
        { report_type_id: "3", code: "material", name: "Material", has_data: true, has_images: false, has_files: true, field_schema: null, sort_order: 3, is_active: true },
        { report_type_id: "4", code: "pengiriman_unit", name: "Pengiriman Unit", has_data: true, has_images: true, has_files: false, field_schema: null, sort_order: 4, is_active: true },
        { report_type_id: "5", code: "instalasi", name: "Instalasi", has_data: true, has_images: true, has_files: false, field_schema: null, sort_order: 5, is_active: true },
        { report_type_id: "6", code: "dokumentasi", name: "Dokumentasi", has_data: false, has_images: true, has_files: false, field_schema: null, sort_order: 6, is_active: true },
        { report_type_id: "7", code: "berita_acara", name: "Berita Acara", has_data: true, has_images: false, has_files: true, field_schema: null, sort_order: 7, is_active: true },
        { report_type_id: "8", code: "serah_terima", name: "Serah Terima", has_data: true, has_images: false, has_files: true, field_schema: null, sort_order: 8, is_active: true },
        { report_type_id: "9", code: "training", name: "Training", has_data: true, has_images: true, has_files: true, field_schema: null, sort_order: 9, is_active: true },
      ];
    }

    return data || [];
  },

  /**
   * Fetch all reports for a specific event with relations
   */
  async getReportsByEvent(eventId: string): Promise<ReportWithRelations[]> {
    if (!eventId) return [];

    const { data: dbReports, error: repErr } = await (supabase as any)
      .from("reports")
      .select(`
        *,
        report_type:report_types(*),
        images:report_images(*),
        files:report_files(*)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (repErr) {
      console.warn("Fallback query for reports due to join issue:", repErr.message);
      // Fallback manual query
      const { data: list, error: listErr } = await (supabase as any)
        .from("reports")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (listErr || !list) return [];

      const reportIds = list.map((r: any) => r.report_id);
      const typeIds = list.map((r: any) => r.report_type_id).filter(Boolean);

      const [typesRes, imgsRes, filesRes] = await Promise.all([
        typeIds.length > 0
          ? (supabase as any).from("report_types").select("*").in("report_type_id", typeIds)
          : Promise.resolve({ data: [] }),
        reportIds.length > 0
          ? (supabase as any).from("report_images").select("*").in("report_id", reportIds).order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] }),
        reportIds.length > 0
          ? (supabase as any).from("report_files").select("*").in("report_id", reportIds).order("uploaded_at", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      const typeMap = new Map((typesRes.data || []).map((t: any) => [t.report_type_id, t]));
      const imgMap = new Map<string, any[]>();
      (imgsRes.data || []).forEach((img: any) => {
        const arr = imgMap.get(img.report_id) || [];
        arr.push(img);
        imgMap.set(img.report_id, arr);
      });

      const fileMap = new Map<string, any[]>();
      (filesRes.data || []).forEach((f: any) => {
        const arr = fileMap.get(f.report_id) || [];
        arr.push(f);
        fileMap.set(f.report_id, arr);
      });

      return list.map((r: any) => {
        const repImages: ReportImageWithUrl[] = (imgMap.get(r.report_id) || []).map((img: any) => ({
          ...img,
          publicUrl: getReportAssetPublicUrl(img.storage_path),
          thumbUrl: getReportAssetPublicUrl(img.thumbnail_path || img.storage_path),
        }));

        const repFiles: ReportFileWithUrl[] = (fileMap.get(r.report_id) || []).map((f: any) => ({
          ...f,
          publicUrl: getReportAssetPublicUrl(f.storage_path),
        }));

        return {
          ...r,
          report_type: typeMap.get(r.report_type_id) || null,
          images: repImages,
          files: repFiles,
        };
      });
    }

    return (dbReports || []).map((r: any) => {
      const repImages: ReportImageWithUrl[] = (r.images || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((img: any) => ({
          ...img,
          publicUrl: getReportAssetPublicUrl(img.storage_path),
          thumbUrl: getReportAssetPublicUrl(img.thumbnail_path || img.storage_path),
        }));

      const repFiles: ReportFileWithUrl[] = (r.files || []).map((f: any) => ({
        ...f,
        publicUrl: getReportAssetPublicUrl(f.storage_path),
      }));

      return {
        ...r,
        images: repImages,
        files: repFiles,
      };
    });
  },

  /**
   * Fetch single report by report_id
   */
  async getReportById(reportId: string): Promise<ReportWithRelations | null> {
    if (!reportId) return null;

    const { data, error } = await (supabase as any)
      .from("reports")
      .select(`
        *,
        report_type:report_types(*),
        images:report_images(*),
        files:report_files(*)
      `)
      .eq("report_id", reportId)
      .maybeSingle();

    if (error || !data) return null;

    const repImages: ReportImageWithUrl[] = (data.images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => ({
        ...img,
        publicUrl: getReportAssetPublicUrl(img.storage_path),
        thumbUrl: getReportAssetPublicUrl(img.thumbnail_path || img.storage_path),
      }));

    const repFiles: ReportFileWithUrl[] = (data.files || []).map((f: any) => ({
      ...f,
      publicUrl: getReportAssetPublicUrl(f.storage_path),
    }));

    return {
      ...data,
      images: repImages,
      files: repFiles,
    };
  },

  /**
   * Fetch all reports with relations and optional filters
   */
  async getAllReports(options?: {
    status?: ReportStatus;
    reportTypeId?: string;
    limit?: number;
  }): Promise<ReportWithRelations[]> {
    let query = (supabase as any)
      .from("reports")
      .select(`
        *,
        report_type:report_types(*),
        images:report_images(*),
        files:report_files(*)
      `)
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.reportTypeId) {
      query = query.eq("report_type_id", options.reportTypeId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: dbReports, error: repErr } = await query;

    if (repErr) {
      console.warn("Fallback query for getAllReports:", repErr.message);
      // Fallback manual query
      let fallbackQuery = (supabase as any)
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (options?.status) fallbackQuery = fallbackQuery.eq("status", options.status);
      if (options?.reportTypeId) fallbackQuery = fallbackQuery.eq("report_type_id", options.reportTypeId);
      if (options?.limit) fallbackQuery = fallbackQuery.limit(options.limit);

      const { data: list, error: listErr } = await fallbackQuery;
      if (listErr || !list) return [];

      const reportIds = list.map((r: any) => r.report_id);
      const typeIds = Array.from(new Set(list.map((r: any) => r.report_type_id).filter(Boolean)));

      const [typesRes, imgsRes, filesRes] = await Promise.all([
        typeIds.length > 0
          ? (supabase as any).from("report_types").select("*").in("report_type_id", typeIds)
          : Promise.resolve({ data: [] }),
        reportIds.length > 0
          ? (supabase as any).from("report_images").select("*").in("report_id", reportIds).order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] }),
        reportIds.length > 0
          ? (supabase as any).from("report_files").select("*").in("report_id", reportIds).order("uploaded_at", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      const typeMap = new Map((typesRes.data || []).map((t: any) => [t.report_type_id, t]));
      const imgMap = new Map<string, any[]>();
      (imgsRes.data || []).forEach((img: any) => {
        const arr = imgMap.get(img.report_id) || [];
        arr.push(img);
        imgMap.set(img.report_id, arr);
      });

      const fileMap = new Map<string, any[]>();
      (filesRes.data || []).forEach((f: any) => {
        const arr = fileMap.get(f.report_id) || [];
        arr.push(f);
        fileMap.set(f.report_id, arr);
      });

      return list.map((r: any) => {
        const repImages: ReportImageWithUrl[] = (imgMap.get(r.report_id) || []).map((img: any) => ({
          ...img,
          publicUrl: getReportAssetPublicUrl(img.storage_path),
          thumbUrl: getReportAssetPublicUrl(img.thumbnail_path || img.storage_path),
        }));

        const repFiles: ReportFileWithUrl[] = (fileMap.get(r.report_id) || []).map((f: any) => ({
          ...f,
          publicUrl: getReportAssetPublicUrl(f.storage_path),
        }));

        return {
          ...r,
          report_type: typeMap.get(r.report_type_id) || null,
          images: repImages,
          files: repFiles,
        };
      });
    }

    return (dbReports || []).map((r: any) => {
      const repImages: ReportImageWithUrl[] = (r.images || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((img: any) => ({
          ...img,
          publicUrl: getReportAssetPublicUrl(img.storage_path),
          thumbUrl: getReportAssetPublicUrl(img.thumbnail_path || img.storage_path),
        }));

      const repFiles: ReportFileWithUrl[] = (r.files || []).map((f: any) => ({
        ...f,
        publicUrl: getReportAssetPublicUrl(f.storage_path),
      }));

      return {
        ...r,
        images: repImages,
        files: repFiles,
      };
    });
  },

  /**
   * Create a new report (draft or submitted)
   */
  async createReport(payload: {
    event_id: string;
    report_type_id: string;
    data?: Record<string, any> | null;
    status?: ReportStatus;
    created_by?: string | null;
  }): Promise<ReportRow> {
    const reportId = safeUUID();
    const insertPayload = {
      report_id: reportId,
      event_id: payload.event_id,
      report_type_id: payload.report_type_id,
      data: payload.data ?? null,
      status: payload.status || ("draft" as ReportStatus),
      created_by: payload.created_by ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("reports")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal membuat laporan: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new draft report
   */
  async createDraftReport(payload: {
    event_id: string;
    report_type_id: string;
    data?: Record<string, any> | null;
    created_by?: string | null;
  }): Promise<ReportRow> {
    return this.createReport({ ...payload, status: "draft" });
  },

  /**
   * Update report payload or status
   */
  async updateReport(
    reportId: string,
    payload: {
      data?: Record<string, any> | null;
      status?: ReportStatus;
    }
  ): Promise<ReportRow> {
    const updatePayload: any = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("reports")
      .update(updatePayload)
      .eq("report_id", reportId)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui laporan: ${error.message}`);
    }

    return data;
  },

  /**
   * Submit report with validation against report_types flags
   */
  async submitReport(reportId: string): Promise<ReportRow> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new Error("Laporan tidak ditemukan.");
    }

    const type = report.report_type;
    if (type) {
      // 1. Validation for has_data
      if (type.has_data) {
        if (!report.data || Object.keys(report.data).length === 0) {
          throw new Error(`Laporan jenis "${type.name}" memerlukan data isian form sebelum disubmit.`);
        }
      }

      // 2. Validation for has_images
      if (type.has_images) {
        if (!report.images || report.images.length === 0) {
          throw new Error(`Laporan jenis "${type.name}" mewajibkan minimal 1 gambar dokumentasi.`);
        }
      }

      // 3. Validation for has_files
      if (type.has_files) {
        if (!report.files || report.files.length === 0) {
          throw new Error(`Laporan jenis "${type.name}" mewajibkan minimal 1 file dokumen/lampiran.`);
        }
      }
    }

    return this.updateReport(reportId, { status: "submitted" });
  },

  /**
   * Upload an image to report with automatic WebP conversion & thumbnail generation
   */
  async uploadReportImage(
    eventId: string,
    reportId: string,
    file: File
  ): Promise<ReportImageWithUrl> {
    const imageId = safeUUID();
    const fullPath = buildReportImagePath(eventId, reportId, imageId, "full");
    const thumbPath = buildReportImagePath(eventId, reportId, imageId, "thumbs");

    // 1. Optimize image (convert to WebP + generate thumb)
    const optimized = await optimizeImage(file);

    // 2. Upload full image to storage
    const { error: fullUploadErr } = await supabase.storage
      .from(REPORT_ASSETS_BUCKET)
      .upload(fullPath, optimized.full, {
        contentType: "image/webp",
        upsert: true,
      });

    if (fullUploadErr) {
      throw new Error(`Gagal mengunggah foto ke storage: ${fullUploadErr.message}`);
    }

    // 3. Upload thumbnail image to storage
    const { error: thumbUploadErr } = await supabase.storage
      .from(REPORT_ASSETS_BUCKET)
      .upload(thumbPath, optimized.thumb, {
        contentType: "image/webp",
        upsert: true,
      });

    if (thumbUploadErr) {
      // Attempt cleanup full image
      await supabase.storage.from(REPORT_ASSETS_BUCKET).remove([fullPath]);
      throw new Error(`Gagal mengunggah thumbnail ke storage: ${thumbUploadErr.message}`);
    }

    // 4. Insert row into report_images
    const sortOrder = Math.floor(Date.now() / 1000) % 1000000;
    const insertPayload = {
      report_image_id: imageId,
      report_id: reportId,
      storage_path: fullPath,
      thumbnail_path: thumbPath,
      file_name: file.name,
      mime_type: "image/webp",
      file_size: optimized.full.size,
      sort_order: sortOrder,
      uploaded_at: new Date().toISOString(),
    };

    const { data: imgRow, error: dbErr } = await (supabase as any)
      .from("report_images")
      .insert(insertPayload)
      .select()
      .single();

    if (dbErr) {
      // Rollback storage files
      await supabase.storage.from(REPORT_ASSETS_BUCKET).remove([fullPath, thumbPath]);
      throw new Error(`Gagal menyimpan data gambar ke database: ${dbErr.message}`);
    }

    return {
      ...imgRow,
      publicUrl: getReportAssetPublicUrl(fullPath),
      thumbUrl: getReportAssetPublicUrl(thumbPath),
    };
  },

  /**
   * Upload multiple images to report sequentially
   */
  async uploadReportImages(
    eventId: string,
    reportId: string,
    files: File[]
  ): Promise<ReportImageWithUrl[]> {
    const results: ReportImageWithUrl[] = [];
    for (const f of files) {
      const res = await this.uploadReportImage(eventId, reportId, f);
      results.push(res);
    }
    return results;
  },

  /**
   * Upload an attachment document/file to report
   */
  async uploadReportFile(
    eventId: string,
    reportId: string,
    file: File
  ): Promise<ReportFileWithUrl> {
    const fileId = safeUUID();
    const filePath = buildReportFilePath(eventId, reportId, fileId, file.name);

    // 1. Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from(REPORT_ASSETS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Gagal mengunggah file ke storage: ${uploadErr.message}`);
    }

    // 2. Insert row into report_files
    const insertPayload = {
      report_file_id: fileId,
      report_id: reportId,
      storage_path: filePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    };

    const { data: fileRow, error: dbErr } = await (supabase as any)
      .from("report_files")
      .insert(insertPayload)
      .select()
      .single();

    if (dbErr) {
      // Rollback storage
      await supabase.storage.from(REPORT_ASSETS_BUCKET).remove([filePath]);
      throw new Error(`Gagal menyimpan data file ke database: ${dbErr.message}`);
    }

    return {
      ...fileRow,
      publicUrl: getReportAssetPublicUrl(filePath),
    };
  },

  /**
   * Upload multiple attachment files to report sequentially
   */
  async uploadReportFiles(
    eventId: string,
    reportId: string,
    files: File[]
  ): Promise<ReportFileWithUrl[]> {
    const results: ReportFileWithUrl[] = [];
    for (const f of files) {
      const res = await this.uploadReportFile(eventId, reportId, f);
      results.push(res);
    }
    return results;
  },

  /**
   * Delete report image and remove files from storage
   */
  async deleteReportImage(reportImageId: string): Promise<void> {
    // 1. Fetch image info
    const { data: img } = await (supabase as any)
      .from("report_images")
      .select("storage_path, thumbnail_path")
      .eq("report_image_id", reportImageId)
      .maybeSingle();

    if (img) {
      const pathsToDelete = [img.storage_path, img.thumbnail_path].filter(Boolean);
      if (pathsToDelete.length > 0) {
        await supabase.storage.from(REPORT_ASSETS_BUCKET).remove(pathsToDelete);
      }
    }

    // 2. Delete database row
    const { error } = await (supabase as any)
      .from("report_images")
      .delete()
      .eq("report_image_id", reportImageId);

    if (error) {
      throw new Error(`Gagal menghapus gambar: ${error.message}`);
    }
  },

  /**
   * Delete report file and remove file from storage
   */
  async deleteReportFile(reportFileId: string): Promise<void> {
    // 1. Fetch file info
    const { data: f } = await (supabase as any)
      .from("report_files")
      .select("storage_path")
      .eq("report_file_id", reportFileId)
      .maybeSingle();

    if (f && f.storage_path) {
      await supabase.storage.from(REPORT_ASSETS_BUCKET).remove([f.storage_path]);
    }

    // 2. Delete database row
    const { error } = await (supabase as any)
      .from("report_files")
      .delete()
      .eq("report_file_id", reportFileId);

    if (error) {
      throw new Error(`Gagal menghapus file: ${error.message}`);
    }
  },

  /**
   * Delete full report and all its images & files
   */
  async deleteReport(reportId: string): Promise<void> {
    const report = await this.getReportById(reportId);
    if (report) {
      // 1. Delete image files
      const imgPaths: string[] = [];
      report.images.forEach((img) => {
        if (img.storage_path) imgPaths.push(img.storage_path);
        if (img.thumbnail_path) imgPaths.push(img.thumbnail_path);
      });
      if (imgPaths.length > 0) {
        await supabase.storage.from(REPORT_ASSETS_BUCKET).remove(imgPaths);
      }

      // 2. Delete attachment files
      const filePaths: string[] = [];
      report.files.forEach((f) => {
        if (f.storage_path) filePaths.push(f.storage_path);
      });
      if (filePaths.length > 0) {
        await supabase.storage.from(REPORT_ASSETS_BUCKET).remove(filePaths);
      }
    }

    // 3. Delete report row (cascades or delete explicitly)
    await (supabase as any).from("report_images").delete().eq("report_id", reportId);
    await (supabase as any).from("report_files").delete().eq("report_id", reportId);
    const { error } = await (supabase as any).from("reports").delete().eq("report_id", reportId);

    if (error) {
      throw new Error(`Gagal menghapus laporan: ${error.message}`);
    }
  },
};
