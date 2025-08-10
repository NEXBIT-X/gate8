import { createClient } from '@supabase/supabase-js';

// Create a service role client for admin operations
// This bypasses RLS policies
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // New secret key name fallback support
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY || // hypothetical new naming
    process.env.SUPABASE_SERVICE_KEY; // alternate common variant

  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL env var');
  }

  if (!serviceRoleKey) {
    console.warn('Service role key not found (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY). Falling back to public key.');
    if (!publicKey) {
      throw new Error('No service role key or public anon/publishable key available for Supabase client');
    }
    return createClient(supabaseUrl, publicKey);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
