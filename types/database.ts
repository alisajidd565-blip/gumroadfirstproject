export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string;
          name: 'free' | 'pro' | 'business';
          display_name: string;
          price_monthly: number;
          project_limit: number;
          stripe_price_id: string | null;
          features: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: 'free' | 'pro' | 'business';
          display_name: string;
          price_monthly?: number;
          project_limit?: number;
          stripe_price_id?: string | null;
          features?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: 'free' | 'pro' | 'business';
          display_name?: string;
          price_monthly?: number;
          project_limit?: number;
          stripe_price_id?: string | null;
          features?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string | null;
          plan_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: 'active' | 'inactive' | 'canceled';
          subscription_ends_at: string | null;
          brand_voice:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          projects_this_month: number;
          month_reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          full_name?: string | null;
          plan_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'active' | 'inactive' | 'canceled';
          subscription_ends_at?: string | null;
          brand_voice?:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          projects_this_month?: number;
          month_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          full_name?: string | null;
          plan_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: 'active' | 'inactive' | 'canceled';
          subscription_ends_at?: string | null;
          brand_voice?:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          projects_this_month?: number;
          month_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      social_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: 'twitter' | 'linkedin';
          provider_user_id: string;
          display_name: string | null;
          username: string | null;
          access_token: string;
          refresh_token: string | null;
          scopes: string[] | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: 'twitter' | 'linkedin';
          provider_user_id: string;
          display_name?: string | null;
          username?: string | null;
          access_token: string;
          refresh_token?: string | null;
          scopes?: string[] | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'twitter' | 'linkedin';
          provider_user_id?: string;
          display_name?: string | null;
          username?: string | null;
          access_token?: string;
          refresh_token?: string | null;
          scopes?: string[] | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'social_connections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_text: string;
          channels: ('twitter' | 'linkedin' | 'instagram' | 'email')[];
          brand_voice:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          status: 'pending' | 'processing' | 'done' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_text: string;
          channels: ('twitter' | 'linkedin' | 'instagram' | 'email')[];
          brand_voice?:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          status?: 'pending' | 'processing' | 'done' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_text?: string;
          channels?: ('twitter' | 'linkedin' | 'instagram' | 'email')[];
          brand_voice?:
            | 'professional'
            | 'casual'
            | 'witty'
            | 'authoritative'
            | 'inspirational'
            | 'educational';
          status?: 'pending' | 'processing' | 'done' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      outputs: {
        Row: {
          id: string;
          project_id: string;
          channel: 'twitter' | 'linkedin' | 'instagram' | 'email';
          content: string;
          edited: boolean;
          tokens_used: number;
          model_used: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          channel: 'twitter' | 'linkedin' | 'instagram' | 'email';
          content: string;
          edited?: boolean;
          tokens_used?: number;
          model_used?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          channel?: 'twitter' | 'linkedin' | 'instagram' | 'email';
          content?: string;
          edited?: boolean;
          tokens_used?: number;
          model_used?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'outputs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      social_publications: {
        Row: {
          id: string;
          user_id: string;
          output_id: string;
          provider: 'twitter' | 'linkedin';
          provider_post_id: string | null;
          provider_url: string | null;
          status: 'published' | 'failed';
          error: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          output_id: string;
          provider: 'twitter' | 'linkedin';
          provider_post_id?: string | null;
          provider_url?: string | null;
          status?: 'published' | 'failed';
          error?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          output_id?: string;
          provider?: 'twitter' | 'linkedin';
          provider_post_id?: string | null;
          provider_url?: string | null;
          status?: 'published' | 'failed';
          error?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'social_publications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'social_publications_output_id_fkey';
            columns: ['output_id'];
            isOneToOne: false;
            referencedRelation: 'outputs';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
