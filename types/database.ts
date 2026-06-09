export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string; owner_id: string; name: string
          status: 'draft' | 'active' | 'completed' | 'archived'
          theme_color: string; settings: Json
          color_config: Json; display_config: Json
          logo_url: string | null; created_at: string
        }
        Insert: {
          id?: string; owner_id: string; name: string
          status?: 'draft' | 'active' | 'completed' | 'archived'
          theme_color?: string; settings?: Json
          color_config?: Json; display_config?: Json
          logo_url?: string | null; created_at?: string
        }
        Update: {
          id?: string; owner_id?: string; name?: string
          status?: 'draft' | 'active' | 'completed' | 'archived'
          theme_color?: string; settings?: Json
          color_config?: Json; display_config?: Json; logo_url?: string | null
        }
      }
      teams: {
        Row: { id: string; tournament_id: string; name: string; created_at: string }
        Insert: { id?: string; tournament_id: string; name: string; created_at?: string }
        Update: { id?: string; tournament_id?: string; name?: string }
      }
      participants: {
        Row: {
          id: string; tournament_id: string; team_id: string | null
          name: string; ruby: string | null
          status: 'active' | 'withdrawn' | 'disqualified'
          nickname: string | null; affiliation: string | null; grade: string | null
          paper_rank: number | null; final_rank: number | null; created_at: string
        }
        Insert: {
          id?: string; tournament_id: string; team_id?: string | null
          name: string; ruby?: string | null
          status?: 'active' | 'withdrawn' | 'disqualified'
          nickname?: string | null; affiliation?: string | null; grade?: string | null
          paper_rank?: number | null; final_rank?: number | null; created_at?: string
        }
        Update: {
          tournament_id?: string; team_id?: string | null
          name?: string; ruby?: string | null
          status?: 'active' | 'withdrawn' | 'disqualified'
          nickname?: string | null; affiliation?: string | null; grade?: string | null
          paper_rank?: number | null; final_rank?: number | null
        }
      }
      rounds: {
        Row: {
          id: string; tournament_id: string; name: string
          order_index: number; rule_id: string; rule_params: Json
          status?: string; created_at: string
        }
        Insert: {
          id?: string; tournament_id: string; name: string
          order_index?: number; rule_id: string; rule_params?: Json
          status?: string; created_at?: string
        }
        Update: {
          tournament_id?: string; name?: string
          order_index?: number; rule_id?: string; rule_params?: Json; status?: string
        }
      }
      matches: {
        Row: {
          id: string; round_id: string; match_num: number
          name: string | null; status: 'pending' | 'active' | 'paused' | 'completed'
          game_state: Json | null; question_text: string | null
          display_token: string; obs_token: string; staff_token: string; created_at: string
        }
        Insert: {
          id?: string; round_id: string; match_num?: number
          name?: string | null; status?: 'pending' | 'active' | 'paused' | 'completed'
          game_state?: Json | null; question_text?: string | null
          display_token?: string; obs_token?: string; staff_token?: string; created_at?: string
        }
        Update: {
          round_id?: string; match_num?: number; name?: string | null
          status?: 'pending' | 'active' | 'paused' | 'completed'
          game_state?: Json | null; question_text?: string | null
          display_token?: string; obs_token?: string; staff_token?: string
        }
      }
      match_participants: {
        Row: { id: string; match_id: string; participant_id: string; position: number }
        Insert: { id?: string; match_id: string; participant_id: string; position?: number }
        Update: { match_id?: string; participant_id?: string; position?: number }
      }
      questions: {
        Row: {
          id: string; tournament_id: string; order_index: number
          body: string; answer: string; genre: string | null
          difficulty: number; note: string | null; used: boolean; created_at: string
        }
        Insert: {
          id?: string; tournament_id: string; order_index?: number
          body?: string; answer?: string; genre?: string | null
          difficulty?: number; note?: string | null; used?: boolean; created_at?: string
        }
        Update: {
          tournament_id?: string; order_index?: number
          body?: string; answer?: string; genre?: string | null
          difficulty?: number; note?: string | null; used?: boolean
        }
      }
      game_events: {
        Row: {
          id: string; match_id: string; seq: number; event_type: string
          actor_id: string | null; operator_id: string | null
          payload: Json; undone: boolean; created_at: string
        }
        Insert: {
          id?: string; match_id: string; seq: number; event_type: string
          actor_id?: string | null; operator_id?: string | null
          payload?: Json; undone?: boolean; created_at?: string
        }
        Update: { undone?: boolean; payload?: Json }
      }
      game_states: {
        Row: { match_id: string; state: Json; event_seq: number; updated_at: string }
        Insert: { match_id: string; state: Json; event_seq?: number; updated_at?: string }
        Update: { state?: Json; event_seq?: number; updated_at?: string }
      }
      paper_rounds: {
        Row: {
          id: string; tournament_id: string; name: string
          order_index: number; time_limit_seconds: number | null
          ranking_priority: Json; created_at: string
        }
        Insert: {
          id?: string; tournament_id: string; name?: string
          order_index?: number; time_limit_seconds?: number | null
          ranking_priority?: Json; created_at?: string
        }
        Update: { name?: string; order_index?: number; time_limit_seconds?: number | null; ranking_priority?: Json }
      }
      paper_questions: {
        Row: {
          id: string; paper_round_id: string; order_index: number
          question_text: string; correct_answer: string
          question_type: string; points: number; created_at: string
        }
        Insert: {
          id?: string; paper_round_id: string; order_index?: number
          question_text?: string; correct_answer?: string
          question_type?: string; points?: number; created_at?: string
        }
        Update: { order_index?: number; question_text?: string; correct_answer?: string; question_type?: string; points?: number }
      }
      paper_submissions: {
        Row: {
          id: string; paper_round_id: string; participant_id: string
          photo_url: string | null; submitted_at: string | null
          raw_score: number; proximity_error: number | null
          chain1: number; chain2: number; chain3: number
          answers: Json; created_at: string
        }
        Insert: {
          id?: string; paper_round_id: string; participant_id: string
          photo_url?: string | null; submitted_at?: string | null
          raw_score?: number; proximity_error?: number | null
          chain1?: number; chain2?: number; chain3?: number
          answers?: Json; created_at?: string
        }
        Update: {
          photo_url?: string | null; submitted_at?: string | null
          raw_score?: number; proximity_error?: number | null
          chain1?: number; chain2?: number; chain3?: number; answers?: Json
        }
      }
      entry_forms: {
        Row: {
          id: string; tournament_id: string; title: string
          description: string | null; fields: Json
          is_open: boolean; created_at: string
        }
        Insert: {
          id?: string; tournament_id: string; title?: string
          description?: string | null; fields?: Json
          is_open?: boolean; created_at?: string
        }
        Update: { title?: string; description?: string | null; fields?: Json; is_open?: boolean }
      }
      entry_responses: {
        Row: {
          id: string; form_id: string; tournament_id: string
          data: Json; participant_id: string | null; created_at: string
        }
        Insert: {
          id?: string; form_id: string; tournament_id: string
          data?: Json; participant_id?: string | null; created_at?: string
        }
        Update: { data?: Json; participant_id?: string | null }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
