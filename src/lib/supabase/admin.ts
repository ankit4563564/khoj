import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Trusted Server-Only Admin Supabase Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations
 * (e.g. matching engine, fingerprint persistence, RLS bypass for trusted backend services).
 *
 * CRITICAL SECURITY RULE:
 * This file and SUPABASE_SERVICE_ROLE_KEY must NEVER be imported or bundled into client-side code.
 */

if (typeof window !== "undefined") {
  throw new Error("CRITICAL SECURITY ERROR: Supabase admin client cannot be instantiated in client-side code.");
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
