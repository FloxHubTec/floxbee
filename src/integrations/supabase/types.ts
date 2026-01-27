export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          contact_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          rule_id: string | null
          status: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          rule_id?: string | null
          status: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          ativo: boolean | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          entregue_em: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          lido_em: string | null
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          lido_em?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agendado_para: string | null
          concluido_em: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          entregues: number | null
          enviados: number | null
          falhas: number | null
          filtro_secretaria: string | null
          filtro_tags: string[] | null
          id: string
          iniciado_em: string | null
          lidos: number | null
          mensagem: string
          nome: string
          respondidos: number | null
          status: string
          template_id: string | null
          total_destinatarios: number | null
          updated_at: string | null
        }
        Insert: {
          agendado_para?: string | null
          concluido_em?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          entregues?: number | null
          enviados?: number | null
          falhas?: number | null
          filtro_secretaria?: string | null
          filtro_tags?: string[] | null
          id?: string
          iniciado_em?: string | null
          lidos?: number | null
          mensagem: string
          nome: string
          respondidos?: number | null
          status?: string
          template_id?: string | null
          total_destinatarios?: number | null
          updated_at?: string | null
        }
        Update: {
          agendado_para?: string | null
          concluido_em?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          entregues?: number | null
          enviados?: number | null
          falhas?: number | null
          filtro_secretaria?: string | null
          filtro_tags?: string[] | null
          id?: string
          iniciado_em?: string | null
          lidos?: number | null
          mensagem?: string
          nome?: string
          respondidos?: number | null
          status?: string
          template_id?: string | null
          total_destinatarios?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          created_at: string | null
          email: string | null
          id: string
          matricula: string | null
          nome: string
          owner_id: string | null
          secretaria: string | null
          tags: string[] | null
          updated_at: string | null
          whatsapp: string
          whatsapp_validated: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome: string
          owner_id?: string | null
          secretaria?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp: string
          whatsapp_validated?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          owner_id?: string | null
          secretaria?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp?: string
          whatsapp_validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          owner_id: string | null
          resolved_at: string | null
          status: string
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          owner_id?: string | null
          resolved_at?: string | null
          status?: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          owner_id?: string | null
          resolved_at?: string | null
          status?: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          conteudo: string
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          sender_id: string | null
          sender_type: string
          status: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type: string
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          matricula: string | null
          nome: string
          permissions: Json | null
          role: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome: string
          permissions?: Json | null
          role?: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          permissions?: Json | null
          role?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          owner_id: string | null
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          owner_id?: string | null
          updated_at?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          owner_id?: string | null
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          numero: number
          owner_id: string | null
          prioridade: string | null
          resolved_at: string | null
          status: string | null
          titulo: string
          updated_at: string | null
          department_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          numero?: number
          owner_id?: string | null
          prioridade?: string | null
          resolved_at?: string | null
          status?: string | null
          titulo: string
          updated_at?: string | null
          department_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          numero?: number
          owner_id?: string | null
          prioridade?: string | null
          resolved_at?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string | null
          department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
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
