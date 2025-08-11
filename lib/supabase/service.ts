import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role key for server-side operations
 * that require elevated permissions like creating user records
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase env vars: require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
