import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let _adminClient: SupabaseClient<Database> | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  return url;
}

// ─── Server-side admin client (service role, bypasses RLS) ───────────────────
// Only use in API routes — never expose to the browser.

export function getAdminSupabase(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminSupabase() must only be called server-side.');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  if (!_adminClient) {
    _adminClient = createClient<Database>(getSupabaseUrl(), serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _adminClient;
}
