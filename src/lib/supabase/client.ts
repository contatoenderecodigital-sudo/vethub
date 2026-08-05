import { createBrowserClient } from "@supabase/ssr";

/** Client do navegador: usa somente a chave anon; RLS faz o isolamento. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
