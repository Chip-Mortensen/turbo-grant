export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chalk_talks: {
        Row: {
          id: string
          media_path: string
          media_type: string
          pinecone_ids: string[] | null
          project_id: string | null
          transcription: string | null
          transcription_error: string | null
          transcription_status: string
          uploaded_at: string
          vectorization_status: string
        }
        Insert: {
          id?: string
          media_path: string
          media_type: string
          pinecone_ids?: string[] | null
          project_id?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string
          uploaded_at?: string
          vectorization_status?: string
        }
        Update: {
          id?: string
          media_path?: string
          media_type?: string
          pinecone_ids?: string[] | null
          project_id?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_status?: string
          uploaded_at?: string
          vectorization_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chalk_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_documents: {
        Row: {
          content: string | null
          created_at: string | null
          document_id: string | null
          file_path: string | null
          file_type: string | null
          file_url: string | null
          id: string
          project_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agency: string | null
          created_at: string
          custom_processor: string | null
          fields: Json[]
          grant_types: string[] | null
          id: string
          name: string
          optional: boolean
          page_limit: number | null
          prompt: string | null
          sources: Database["public"]["Enums"]["document_source_type"][]
          updated_at: string
        }
        Insert: {
          agency?: string | null
          created_at?: string
          custom_processor?: string | null
          fields: Json[]
          grant_types?: string[] | null
          id?: string
          name: string
          optional?: boolean
          page_limit?: number | null
          prompt?: string | null
          sources: Database["public"]["Enums"]["document_source_type"][]
          updated_at?: string
        }
        Update: {
          agency?: string | null
          created_at?: string
          custom_processor?: string | null
          fields?: Json[]
          grant_types?: string[] | null
          id?: string
          name?: string
          optional?: boolean
          page_limit?: number | null
          prompt?: string | null
          sources?: Database["public"]["Enums"]["document_source_type"][]
          updated_at?: string
        }
        Relationships: []
      }
      foas: {
        Row: {
          agency: string
          animal_trials: boolean | null
          award_ceiling: number | null
          award_floor: number | null
          created_at: string | null
          deadline: string | null
          description: string | null
          foa_code: string | null
          grant_type: Json | null
          grant_url: string | null
          human_trials: boolean | null
          id: string
          letters_of_intent: boolean | null
          num_awards: number | null
          organization_eligibility: Json | null
          pinecone_ids: string[] | null
          preliminary_proposal: boolean | null
          published_date: string | null
          title: string
          updated_at: string | null
          vectorization_status: string
        }
        Insert: {
          agency: string
          animal_trials?: boolean | null
          award_ceiling?: number | null
          award_floor?: number | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          foa_code?: string | null
          grant_type?: Json | null
          grant_url?: string | null
          human_trials?: boolean | null
          id?: string
          letters_of_intent?: boolean | null
          num_awards?: number | null
          organization_eligibility?: Json | null
          pinecone_ids?: string[] | null
          preliminary_proposal?: boolean | null
          published_date?: string | null
          title: string
          updated_at?: string | null
          vectorization_status?: string
        }
        Update: {
          agency?: string
          animal_trials?: boolean | null
          award_ceiling?: number | null
          award_floor?: number | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          foa_code?: string | null
          grant_type?: Json | null
          grant_url?: string | null
          human_trials?: boolean | null
          id?: string
          letters_of_intent?: boolean | null
          num_awards?: number | null
          organization_eligibility?: Json | null
          pinecone_ids?: string[] | null
          preliminary_proposal?: boolean | null
          published_date?: string | null
          title?: string
          updated_at?: string | null
          vectorization_status?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          era_commons_code: string | null
          id: string
          metadata: Json | null
          name: string
          nsf_id: string | null
          organization_type:
            | Database["public"]["Enums"]["organization_type"]
            | null
          sam_status: boolean
          uei: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          era_commons_code?: string | null
          id?: string
          metadata?: Json | null
          name: string
          nsf_id?: string | null
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          sam_status: boolean
          uei?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          era_commons_code?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          nsf_id?: string | null
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          sam_status?: boolean
          uei?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          chunk_end: number | null
          chunk_start: number | null
          content_id: string
          content_type: string
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          priority: number | null
          project_id: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          chunk_end?: number | null
          chunk_start?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          project_id?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          chunk_end?: number | null
          chunk_start?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          project_id?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sources: {
        Row: {
          citation: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string | null
          reason: string | null
          updated_at: string
          url: string
        }
        Insert: {
          citation?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          reason?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          citation?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          reason?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recommended_equipment: {
        Row: {
          created_at: string
          equipment: Json[]
          id: string
          project_id: string | null
          updated_at: string
          viewed: boolean
        }
        Insert: {
          created_at?: string
          equipment?: Json[]
          id?: string
          project_id?: string | null
          updated_at?: string
          viewed?: boolean
        }
        Update: {
          created_at?: string
          equipment?: Json[]
          id?: string
          project_id?: string | null
          updated_at?: string
          viewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recommended_equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_descriptions: {
        Row: {
          file_name: string
          file_path: string
          file_type: string
          id: string
          pinecone_ids: string[] | null
          project_id: string | null
          uploaded_at: string
          vectorization_status: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_type: string
          id?: string
          pinecone_ids?: string[] | null
          project_id?: string | null
          uploaded_at?: string
          vectorization_status?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          pinecone_ids?: string[] | null
          project_id?: string | null
          uploaded_at?: string
          vectorization_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "written_descriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          attachments: Json
          created_at: string
          foa: string | null
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string
          foa?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string
          foa?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_foa_fkey"
            columns: ["foa"]
            isOneToOne: false
            referencedRelation: "foas"
            referencedColumns: ["id"]
          },
        ]
      }
      scientific_figures: {
        Row: {
          ai_description: string | null
          caption: string | null
          id: string
          image_path: string
          order_index: number
          pinecone_id: string | null
          project_id: string | null
          uploaded_at: string
          vectorization_status: string
        }
        Insert: {
          ai_description?: string | null
          caption?: string | null
          id?: string
          image_path: string
          order_index: number
          pinecone_id?: string | null
          project_id?: string | null
          uploaded_at?: string
          vectorization_status?: string
        }
        Update: {
          ai_description?: string | null
          caption?: string | null
          id?: string
          image_path?: string
          order_index?: number
          pinecone_id?: string | null
          project_id?: string | null
          uploaded_at?: string
          vectorization_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scientific_figures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          era_commons_id: string | null
          first_name: string
          id: string
          institution_id: string | null
          last_name: string
          metadata: Json | null
          orcid: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          era_commons_id?: string | null
          first_name: string
          id: string
          institution_id?: string | null
          last_name: string
          metadata?: Json | null
          orcid?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          era_commons_id?: string | null
          first_name?: string
          id?: string
          institution_id?: string | null
          last_name?: string
          metadata?: Json | null
          orcid?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: {
          data: string
        }
        Returns: string
      }
      http: {
        Args: {
          request: Database["public"]["CompositeTypes"]["http_request"]
        }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete:
        | {
            Args: {
              uri: string
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
        | {
            Args: {
              uri: string
              content: string
              content_type: string
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
      http_get:
        | {
            Args: {
              uri: string
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
        | {
            Args: {
              uri: string
              data: Json
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
      http_head: {
        Args: {
          uri: string
        }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: {
          field: string
          value: string
        }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: {
          uri: string
          content: string
          content_type: string
        }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post:
        | {
            Args: {
              uri: string
              content: string
              content_type: string
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
        | {
            Args: {
              uri: string
              data: Json
            }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
          }
      http_put: {
        Args: {
          uri: string
          content: string
          content_type: string
        }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: {
          curlopt: string
          value: string
        }
        Returns: boolean
      }
      process_vectorization_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      text_to_bytea: {
        Args: {
          data: string
        }
        Returns: string
      }
      urlencode:
        | {
            Args: {
              data: Json
            }
            Returns: string
          }
        | {
            Args: {
              string: string
            }
            Returns: string
          }
        | {
            Args: {
              string: string
            }
            Returns: string
          }
    }
    Enums: {
      document_field_type: "text" | "textarea" | "select"
      document_source_type:
        | "research_description"
        | "scientific_figure"
        | "chalk_talk"
        | "foa"
      organization_type:
        | "city_township_government"
        | "county_government"
        | "for_profit"
        | "independent_school_district"
        | "individual"
        | "native_american_tribal_government"
        | "native_american_tribal_organization"
        | "non_profit"
        | "others"
        | "private_higher_education_institution"
        | "public_higher_education_institution"
        | "public_housing_authorities"
        | "small_business"
        | "special_district_gGovernments"
        | "state_governments"
        | "unrestricted"

      user_role:
        | "Principal Investigator"
        | "Co-Principal Investigator"
        | "Co-Investigator"
        | "Senior Personnel"
        | "Postdoctoral Researcher"
        | "Graduate Student"
        | "Undergraduate Student"
        | "Project Administrator"
        | "Authorized Organizational Representative"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
