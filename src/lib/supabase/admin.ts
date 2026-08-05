import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com service_role: SOMENTE em código de servidor
 * (route handlers / server actions). Ignora RLS: todo uso precisa
 * validar o chamador manualmente. Nunca importar em componente client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
