export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string; owner_id: string; name: string; slug: string | null
          logo_url: string | null; theme_color: string
          status: 'draft' | 'active' | 'completed' | 'archived'
          settings: Json; created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tournaments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>
      }
      tournament_members: {
        Row: { id: string; tournament_id: string; user_id: string; role: 'admin' | 'operator' | 'staff' | 'display' }
        Insert: Omit<Database['public']['Tables']['tournament_members']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['tournament_members']['Insert']>
      }
      teams: {
        Row: { id: string; tournament_id: string; name: string; ruby: string | null; color: string | null; order_num: number }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      participants: {
        Row: {
          id: string; tournament_id: string; team_id: string | null
          name: string; ruby: string | null; seed: number; group_label: string | null
          status: 'active' | 'withdrawn' | 'disqualified'; extra: Json; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['participants']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
      }
      rounds: {
        Row: {
          id: string; tournament_id: string; name: string; rule_id: string
          rule_params: Json; order_num: number
          status: 'pending' | 'active' | 'completed'; settings: Json; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rounds']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rounds']['Insert']>
      }
      matches: {
        Row: {
          id: string; round_id: string; tournament_id: string; match_num: number
          name: string | null; status: 'pending' | 'active' | 'paused' | 'completed'
          winner_ids: string[]; question_count: number
          display_token: string; obs_token: string; settings: Json
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at' | 'updated_at' | 'display_token' | 'obs_token'> & {
          id?: string; created_at?: string; updated_at?: string
          display_token?: string; obs_token?: string
        }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
      }
      match_participants: {
        Row: { id: string; match_id: string; participant_id: string; position: number }
        Insert: Omit<Database['public']['Tables']['match_participants']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['match_participants']['Insert']>
      }
      questions: {
        Row: {
          id: string; tournament_id: string; seq_num: number | null
          question_text: string | null; answer_text: string | null
          genre: string | null; difficulty: number; note: string | null
          status: 'unused' | 'used' | 'skipped'; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['questions']['Insert']>
      }
      game_events: {
        Row: {
          id: string; match_id: string; seq: number; event_type: string
          actor_id: string | null; operator_id: string | null
          payload: Json; undone: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_events']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_events']['Insert']>
      }
      game_states: {
        Row: { match_id: string; state: Json; event_seq: number; updated_at: string }
        Insert: Omit<Database['public']['Tables']['game_states']['Row'], 'updated_at'> & { updated_at?: string }
        Update: Partial<Database['public']['Tables']['game_states']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
