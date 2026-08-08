import { exigirRecurso } from "@/lib/auth";

/**
 * Trava do plano para esta seção inteira.
 *
 * Fica no layout, e não em cada página: assim uma tela nova criada dentro
 * desta pasta já nasce protegida, sem alguém precisar lembrar de repetir a
 * verificação. Quem não tem o recurso é levado à tela que explica o que ele
 * faz — o menu já mostra o cadeado, mas cadeado é convite de venda; a
 * barreira de verdade é esta, no servidor.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirRecurso("comissoes");
  return <>{children}</>;
}
