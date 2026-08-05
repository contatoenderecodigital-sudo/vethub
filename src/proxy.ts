import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase a cada request, protege as rotas
 * (sem login → /login; logado em página de auth → /dashboard) e
 * aplica os cabeçalhos de segurança, incluindo CSP com nonce.
 */

/** Domínio do Supabase deste projeto — usado no connect-src e img-src. */
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Política de segurança de conteúdo.
 *
 * `strict-dynamic` faz o navegador confiar só nos scripts carregados a
 * partir de um script com nonce — isso cobre os bundles do Next e o SDK
 * da Meta (carregado pelo nosso código), sem precisar liberar domínio.
 * O Next lê este cabeçalho e repassa o nonce aos próprios scripts.
 *
 * `style-src` precisa de 'unsafe-inline': o Tailwind e o next/font
 * injetam estilo inline e não há como nonce-ar tudo hoje.
 */
function montarCSP(nonce: string, desenvolvimento: boolean): string {
  const scriptExtra = desenvolvimento ? " 'unsafe-eval'" : "";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'${scriptExtra}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${SUPABASE}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${SUPABASE} ${SUPABASE.replace("https://", "wss://")} https://viacep.com.br https://graph.facebook.com`,
    `frame-src 'self' https://www.facebook.com https://web.facebook.com`,
    // Ninguém embute o VetHub em iframe (defesa contra clickjacking)
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function aplicarCabecalhos(
  headers: Headers,
  nonce: string,
  desenvolvimento: boolean
) {
  headers.set("Content-Security-Policy", montarCSP(nonce, desenvolvimento));
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("X-DNS-Prefetch-Control", "off");
}

export default async function proxy(request: NextRequest) {
  const desenvolvimento = process.env.NODE_ENV === "development";
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // O nonce viaja no request para o layout conseguir marcar o script
  // inline do tema (que roda antes da primeira pintura).
  const cabecalhosDaRequisicao = new Headers(request.headers);
  cabecalhosDaRequisicao.set("x-nonce", nonce);

  let response = NextResponse.next({
    request: { headers: cabecalhosDaRequisicao },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: cabecalhosDaRequisicao },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: não colocar lógica entre createServerClient e getUser —
  // renovar a sessão primeiro evita deslogar o usuário aleatoriamente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const paginaDeAuth = path === "/login" || path === "/cadastro";
  // Páginas legais públicas — precisam abrir sem login (exigência da Meta/LGPD)
  // e continuar acessíveis para quem já está logado.
  const paginaPublica =
    path === "/politica-de-privacidade" ||
    path === "/termos-de-uso" ||
    path === "/exclusao-de-dados";

  if (!user && !paginaDeAuth && !paginaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirecionamento = NextResponse.redirect(url);
    aplicarCabecalhos(redirecionamento.headers, nonce, desenvolvimento);
    return redirecionamento;
  }

  if (user && (paginaDeAuth || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirecionamento = NextResponse.redirect(url);
    aplicarCabecalhos(redirecionamento.headers, nonce, desenvolvimento);
    return redirecionamento;
  }

  aplicarCabecalhos(response.headers, nonce, desenvolvimento);
  return response;
}

export const config = {
  matcher: [
    // Tudo, exceto estáticos, imagens e rotas de API
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
