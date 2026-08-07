import { redirect } from "next/navigation";
import { Building2, Plus, Power, Store } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatEndereco, formatTelefone } from "@/lib/format";
import { mascaraCNPJ } from "@/lib/validacao";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Campo, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  alternarUnidade,
  criarUnidade,
  definirUnidadeDoUsuario,
} from "./actions";

export const metadata = { title: "Unidades" };

interface UnidadeLinha {
  id: string;
  nome: string;
  principal: boolean;
  ativa: boolean;
  cnpj: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

interface PessoaLinha {
  id: string;
  nome: string;
  papel: string;
  unidade_id: string | null;
}

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Administrador",
  veterinario: "Veterinário",
  recepcao: "Recepção",
};

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  const [{ data: unidades }, { data: pessoas }] = await Promise.all([
    supabase
      .from("unidade")
      .select("*")
      .order("principal", { ascending: false })
      .order("nome")
      .returns<UnidadeLinha[]>(),
    supabase
      .from("usuario")
      .select("id, nome, papel, unidade_id")
      .order("nome")
      .returns<PessoaLinha[]>(),
  ]);

  const lista = unidades ?? [];
  const ativas = lista.filter((u) => u.ativa);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Unidades"
        subtitulo={`${ativas.length} ${ativas.length === 1 ? "ativa" : "ativas"} de ${lista.length}`}
      />

      {erro && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50"
        >
          {erro}
        </p>
      )}

      <Card className="mb-4">
        <p className="mb-3 text-sm text-ink-muted">
          Tutores, pets e o catálogo de produtos são compartilhados entre todas
          as unidades: o cliente é atendido em qualquer uma. O que fica
          separado é o que é físico: <strong className="text-ink">estoque,
          caixa, agenda e internação</strong>.
        </p>

        <ul className="divide-y divide-white/15">
          {lista.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                aria-hidden
              >
                {u.principal ? (
                  <Building2 className="size-4" strokeWidth={1.8} />
                ) : (
                  <Store className="size-4" strokeWidth={1.8} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                  {u.nome}
                  {u.principal && <Badge tom="brand">Matriz</Badge>}
                  {!u.ativa && <Badge tom="neutro">Inativa</Badge>}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {[
                    u.cnpj ? mascaraCNPJ(u.cnpj) : null,
                    u.telefone ? formatTelefone(u.telefone) : null,
                    formatEndereco(u) || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem dados de contato"}
                </p>
              </div>

              {!u.principal && (
                <form action={alternarUnidade.bind(null, u.id, !u.ativa)}>
                  <ConfirmButton
                    variante={u.ativa ? "ghost" : "secondary"}
                    tamanho="sm"
                    titulo={u.ativa ? "Desativar unidade" : "Reativar unidade"}
                    mensagem={
                      u.ativa
                        ? `Desativar "${u.nome}"? Ela some dos seletores, mas o histórico de vendas e o estoque continuam guardados.`
                        : `Reativar "${u.nome}"?`
                    }
                    rotuloConfirmar={u.ativa ? "Desativar" : "Reativar"}
                  >
                    <Power className="size-4 shrink-0" />
                    {u.ativa ? "Desativar" : "Reativar"}
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-4">
        <CardTitulo>Nova unidade</CardTitulo>
        <form action={criarUnidade} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Nome" htmlFor="nome" obrigatorio className="sm:col-span-1">
              <Input id="nome" name="nome" placeholder="Ex.: Unidade Centro" required />
            </Campo>
            <Campo rotulo="CNPJ" htmlFor="cnpj">
              <Input id="cnpj" name="cnpj" inputMode="numeric" />
            </Campo>
            <Campo rotulo="Telefone" htmlFor="telefone">
              <Input id="telefone" name="telefone" inputMode="numeric" />
            </Campo>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Campo rotulo="CEP" htmlFor="cep">
              <Input id="cep" name="cep" inputMode="numeric" />
            </Campo>
            <Campo rotulo="Endereço" htmlFor="logradouro" className="sm:col-span-2">
              <Input id="logradouro" name="logradouro" />
            </Campo>
            <Campo rotulo="Número" htmlFor="numero">
              <Input id="numero" name="numero" />
            </Campo>
            <Campo rotulo="Complemento" htmlFor="complemento">
              <Input id="complemento" name="complemento" />
            </Campo>
            <Campo rotulo="Bairro" htmlFor="bairro">
              <Input id="bairro" name="bairro" />
            </Campo>
            <Campo rotulo="Cidade" htmlFor="cidade">
              <Input id="cidade" name="cidade" />
            </Campo>
            <Campo rotulo="UF" htmlFor="uf">
              <Input id="uf" name="uf" maxLength={2} />
            </Campo>
          </div>

          <SubmitButton carregando="Criando…">
            <Plus className="size-4" />
            Criar unidade
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <CardTitulo>Onde cada pessoa trabalha</CardTitulo>
        <p className="mb-3 text-xs text-ink-muted">
          Deixe em branco para quem precisa enxergar a clínica inteira: dono,
          gerente, quem cuida do financeiro.
        </p>

        <ul className="divide-y divide-white/15">
          {(pessoas ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.nome}</p>
                <p className="text-xs text-ink-muted">
                  {ROTULO_PAPEL[p.papel] ?? p.papel}
                </p>
              </div>
              <form
                action={definirUnidadeDoUsuario.bind(null, p.id)}
                className="flex shrink-0 items-center gap-2"
              >
                <Select
                  name="unidade_id"
                  defaultValue={p.unidade_id ?? ""}
                  aria-label={`Unidade de ${p.nome}`}
                  className="h-9 w-auto min-w-44 text-sm"
                >
                  <option value="">Todas as unidades</option>
                  {ativas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </Select>
                <SubmitButton variante="secondary" tamanho="sm" carregando="…">
                  Salvar
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
