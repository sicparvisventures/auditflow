import { createClient } from '@supabase/supabase-js';

import { Env } from '@/libs/Env';

// Client-side Supabase client
export const supabase = createClient(
  Env.NEXT_PUBLIC_SUPABASE_URL || '',
  Env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// For type-safe queries
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          clerk_org_id: string;
          name: string;
          slug: string;
          tier: string;
          status: string;
          primary_color: string | null;
          secondary_color: string | null;
          accent_color: string | null;
          logo_url: string | null;
          max_users: number;
          max_locations: number;
          max_audits_per_month: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'admin' | 'inspector' | 'manager' | 'viewer';
          active: boolean;
          current_organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'full_name' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          country: string;
          phone: string | null;
          email: string | null;
          manager_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
      };
      audits: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          template_id: string | null;
          inspector_id: string;
          audit_date: string;
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          total_score: number;
          max_score: number;
          pass_percentage: number;
          passed: boolean;
          comments: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audits']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['audits']['Insert']>;
      };
      actions: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          audit_id: string | null;
          audit_result_id: string | null;
          title: string;
          description: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
          urgency: 'low' | 'medium' | 'high' | 'critical';
          assigned_to_id: string | null;
          created_by_id: string | null;
          deadline: string | null;
          photo_urls: string[];
          response_text: string | null;
          response_photos: string[];
          responded_at: string | null;
          verified_by_id: string | null;
          verified_at: string | null;
          verification_notes: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['actions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['actions']['Insert']>;
      };
    };
  };
};
