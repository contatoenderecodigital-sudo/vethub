import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client de servidor (RSC, server actions, route handlers): chave anon + sessão do cookie. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component, pode ignorar
            // se o proxy estiver renovando a sessão.
          }
        },
      },
    }
  );
}
