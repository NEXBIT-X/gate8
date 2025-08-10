import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser (public) Supabase client.
 * Supports both legacy anon key env var and the new publishable key naming.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Fallback order: legacy anon key -> new publishable key
  const anonOrPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL env var");
  if (!anonOrPublishableKey) {
    throw new Error(
      "Missing Supabase anon/publishable key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return createBrowserClient(url, anonOrPublishableKey);
}
