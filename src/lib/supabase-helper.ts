/**
 * Helper to execute Supabase query and enforce error handling.
 * Throws an explicit Error if Supabase returns an error object.
 */
export async function handleSupabaseResult<T>(
  promise: PromiseLike<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    console.error("Supabase Database Error:", error);
    const msg = error.message || error.details || error.hint || "Terjadi kesalahan pada koneksi database Supabase.";
    throw new Error(msg);
  }
  return data as T;
}

/**
 * Helper to check error for Supabase mutation queries (insert/update/delete)
 * where return data might not be requested.
 */
export async function assertSupabaseNoError(
  promise: PromiseLike<{ error: any; data?: any }>
): Promise<void> {
  const { error } = await promise;
  if (error) {
    console.error("Supabase Operation Failed:", error);
    const msg = error.message || error.details || error.hint || "Gagal memperbarui data di database.";
    throw new Error(msg);
  }
}
