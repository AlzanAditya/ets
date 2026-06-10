import { supabase } from '@/lib/supabase'
import type { ClientRow, ClientInsert, ClientUpdate } from '@/types/database'

export const clientsService = {

  async getClients(): Promise<ClientRow[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('deleted_at', null)
      .order('customer_name', { ascending: true })

    if (error) throw new Error(`Failed to fetch clients: ${error.message}`)
    return data ?? []
  },

  async getClientById(client_id: string): Promise<ClientRow | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', client_id)
      .is('deleted_at', null)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch client: ${error.message}`)
    }
    return data ?? null
  },

  async createClient(data: ClientInsert): Promise<ClientRow> {
    const { data: created, error } = await supabase
      .from('clients')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Failed to create client: ${error.message}`)
    if (!created) throw new Error('Client creation returned no data')
    return created
  },

  async updateClient(client_id: string, data: ClientUpdate): Promise<ClientRow> {
    const { data: updated, error } = await supabase
      .from('clients')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('client_id', client_id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update client: ${error.message}`)
    if (!updated) throw new Error('Client update returned no data')
    return updated
  },

  /** Soft delete via deleted_at */
  async deleteClient(client_id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .eq('client_id', client_id)

    if (error) throw new Error(`Failed to delete client: ${error.message}`)
  },

  async getClientCount(): Promise<number> {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (error) throw new Error(`Failed to count clients: ${error.message}`)
    return count ?? 0
  },
}
