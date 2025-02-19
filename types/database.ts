export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      research_projects: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      written_descriptions: {
        Row: {
          id: string
          project_id: string
          file_path: string
          file_name: string
          file_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_path: string
          file_name: string
          file_type: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_path?: string
          file_name?: string
          file_type?: string
          uploaded_at?: string
        }
      }
      scientific_figures: {
        Row: {
          id: string
          project_id: string
          image_path: string
          caption: string | null
          order_index: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          image_path: string
          caption?: string | null
          order_index: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          image_path?: string
          caption?: string | null
          order_index?: number
          uploaded_at?: string
        }
      }
      chalk_talks: {
        Row: {
          id: string
          project_id: string
          media_path: string
          media_type: 'video' | 'audio'
          transcription: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          media_path: string
          media_type: 'video' | 'audio'
          transcription?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          media_path?: string
          media_type?: 'video' | 'audio'
          transcription?: string | null
          uploaded_at?: string
        }
      }
      researcher_profiles: {
        Row: {
          id: string
          project_id: string
          name: string
          title: string | null
          institution: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          title?: string | null
          institution?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          title?: string | null
          institution?: string | null
          bio?: string | null
          created_at?: string
        }
      }
      grant_types: {
        Row: {
          id: string
          name: string
          organization: string
          description: string | null
          instructions: string | null
          is_custom: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          organization: string
          description?: string | null
          instructions?: string | null
          is_custom?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          organization?: string
          description?: string | null
          instructions?: string | null
          is_custom?: boolean
          created_at?: string
        }
      }
      project_grants: {
        Row: {
          id: string
          project_id: string
          grant_type_id: string
          status: 'draft' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          grant_type_id: string
          status: 'draft' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          grant_type_id?: string
          status?: 'draft' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 