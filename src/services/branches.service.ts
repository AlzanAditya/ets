import { supabase } from '@/lib/supabase'
import type { BranchRow, BranchInsert, BranchUpdate } from '@/types/database'

export const branchesService = {

  async getBranches(): Promise<BranchRow[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .is('deleted_at', null)
      .order('branch_name', { ascending: true })

    if (error) throw new Error(`Failed to fetch branches: ${error.message}`)
    return data ?? []
  },

  async getBranchById(branch_id: string): Promise<BranchRow | null> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('branch_id', branch_id)
      .is('deleted_at', null)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch branch: ${error.message}`)
    }
    return data ?? null
  },

  async createBranch(data: BranchInsert): Promise<BranchRow> {
    const { data: created, error } = await supabase
      .from('branches')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Failed to create branch: ${error.message}`)
    if (!created) throw new Error('Branch creation returned no data')
    return created
  },

  async updateBranch(branch_id: string, data: BranchUpdate): Promise<BranchRow> {
    const { data: updated, error } = await supabase
      .from('branches')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('branch_id', branch_id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update branch: ${error.message}`)
    if (!updated) throw new Error('Branch update returned no data')
    return updated
  },

  /** Soft delete via deleted_at */
  async deleteBranch(branch_id: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .eq('branch_id', branch_id)

    if (error) throw new Error(`Failed to delete branch: ${error.message}`)
  },

  async getBranchCount(): Promise<number> {
    const { count, error } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (error) throw new Error(`Failed to count branches: ${error.message}`)
    return count ?? 0
  },
}
