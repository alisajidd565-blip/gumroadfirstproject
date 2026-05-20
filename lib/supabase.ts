import { createClient } from '@supabase/supabase-js';

// ─── Browser client (uses anon key, respects RLS) ─────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Server-side admin client (uses service role key, bypasses RLS) ───────────
// Only use this in API routes, never expose to the browser.
let _adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminSupabase() must only be called server-side.');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _adminClient;
}
