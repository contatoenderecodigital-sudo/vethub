import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronRight,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, formatEndereco, formatTelefone } from "@/lib/format";
import type { CompraStatus, Fornecedor } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { BadgeCompra } from "../../compras/badge-compra";
import { excluirFornecedor } from "../actions";
import { formatCNPJ } from "../schema";

export const metadata = { title: "Fornecedor" };

interface LinhaCompra {
  id: string;
  data: string;
  numero_nota: string | null;
  valor_total: number;
  status: CompraStatus;
}

/** Uma linha "rótulo: valor" da ficha do fornecedor. */
function Dado({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex shrink-0 items-center gap-2 text-ink-muted">
        {icone}
        {rotulo}
      </dt>
      <dd className="min-w-0 text-right font-medium text-ink">{valor}</dd>
    </div>
  );
}

export default async function FornecedorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: fornecedor } = await supabase
    .from("fornecedor")
    .select("*")
    .eq("id", id)
    .single<Fornecedor>();

  if (!fornecedor) notFound();

  const { data: compras } = await supabase
    .from("compra")
    .select("id, data, numero_nota, valor_total, status")
    .eq("fornecedor_id", id)
    .order("data", { ascending: false })
    .limit(10)
    .returns<LinhaCompra[]>();

  const historico = compras ?? [];
  const excluirComId = excluirFornecedor.bind(null, id);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={fornecedor.nome}
        subtitulo={fornecedor.razao_social ?? "Fornecedor"}
        acao={
          <>
            <ButtonLink href={`/compras/nova?fornecedor=${id}`} variante="secondary">
              <Plus className="size-4" />
              Nova compra
            </ButtonLink>
            <ButtonLink href={`/fornecedores/${id}/editar`} variante="secondary">
              <Pencil className="size-4" />
              Editar
            </ButtonLink>
            {usuario.papel === "admin" && (
              <form action={excluirComId}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir este fornecedor? As compras já lançadas continuam no histórico, mas sem o vínculo."
                >
                  <Trash2 className="size-4" />
                  Excluir
                </ConfirmButton>
              </form>
            )}
          </>
        }
      />

      {erro && (
        <p className="rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CardTitulo className="mb-0">Dados do fornecedor</CardTitulo>
            {!fornecedor.ativo && <Badge tom="neutro">Inativo</Badge>}
          </div>

          <dl className="space-y-3 text-sm">
            <Dado
              icone={<IdCard className="size-4" />}
              rotulo="CNPJ"
              valor={formatCNPJ(fornecedor.cnpj)}
            />
            <Dado
              icone={<Building2 className="size-4" />}
              rotulo="Razão social"
              valor={fornecedor.razao_social ?? "—"}
            />
            <Dado
              icone={<Phone className="size-4" />}
              rotulo="Telefone"
              valor={fornecedor.telefone ? formatTelefone(fornecedor.telefone) : "—"}
            />
            <Dado
              icone={<Mail className="size-4" />}
              rotulo="E-mail"
              valor={fornecedor.email ?? "—"}
            />
            <Dado
              icone={<User className="size-4" />}
              rotulo="Contato"
              valor={fornecedor.contato ?? "—"}
            />
            <Dado
              icone={<MapPin className="size-4" />}
              rotulo="Endereço"
              valor={formatEndereco(fornecedor)}
            />
          </dl>

          {fornecedor.observacao && (
            <p className="mt-4 whitespace-pre-wrap border-t border-edge pt-3 text-sm text-ink-muted">
              {fornecedor.observacao}
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <CardTitulo className="mb-0">Últimas compras</CardTitulo>
            <ButtonLink
              href={`/compras?fornecedor=${id}`}
              variante="secondary"
              tamanho="sm"
            >
              Ver todas
            </ButtonLink>
          </div>

          {historico.length === 0 ? (
            <EmptyState
              icone={<ShoppingBag className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma compra lançada"
              mensagem="As notas lançadas para este fornecedor aparecem aqui."
              acao={
                <ButtonLink href={`/compras/nova?fornecedor=${id}`}>
                  <Plus className="size-4" />
                  Lançar compra
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {historico.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/compras/${c.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">
                        {c.numero_nota ? `NF ${c.numero_nota}` : "Compra sem nota"}
                      </p>
                      <p className="text-xs text-ink-muted tabular-nums">
                        {formatDataISO(c.data)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-ink tabular-nums">
                      {formatBRL(c.valor_total)}
                    </span>
                    <BadgeCompra status={c.status} />
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
