// Database types for Supabase tables
// This file provides TypeScript types for our database schema

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
      documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_type: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_type: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          content?: string
          created_at?: string
        }
      }
      memories: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          text: string
          cognee_id: string | null
          entities: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          text: string
          cognee_id?: string | null
          entities?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          text?: string
          cognee_id?: string | null
          entities?: Json
          created_at?: string
        }
      }
      cognee_fallback: {
        Row: {
          id: string
          user_id: string | null
          text: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          text: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          text?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      create_cognee_fallback_table_if_not_exists: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {}
  }
}
