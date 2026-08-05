import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatTelefone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ClipboardList } from "lucide-react";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { AssinaturaForm } from "../assinatura-form";
import { carregarPlanosAtivos } from "../../dados";
import { primeiro } from "../../schema";

export const metadata = { title: "Nova assinatura" };

export default async function NovaAssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ tutor?: string; pet?: string; plano?: string; erro?: string }>;
}) {
  const { tutor, pet, plano, erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  // Veterinário consulta as assinaturas, mas quem assina é balcão/admin.
  if (usuario.papel === "veterinario") redirect("/planos/assinaturas");

  const planos = await carregarPlanosAtivos();

  // Pré-seleção quando a página é aberta a partir do tutor, do pet ou do plano.
  let tutorInicial: OpcaoBusca | undefined;
  if (tutor) {
    const { data } = await supabase
      .from("tutor")
      .select("id, nome, telefone")
      .eq("id", tutor)
      .single<{ id: string; nome: string; telefone: string }>();
    if (data) {
      tutorInicial = {
        id: data.id,
        rotulo: data.nome,
        detalhe: formatTelefone(data.telefone),
      };
    }
  }

  let petInicial: OpcaoBusca | undefined;
  if (pet) {
    const { data } = await supabase
      .from("pet")
      .select("id, nome, especie, tutor:tutor_id (nome)")
      .eq("id", pet)
      .single<{
        id: string;
        nome: string;
        especie: string;
        tutor: { nome: string } | { nome: string }[] | null;
      }>();
    if (data) {
      const dono = primeiro(data.tutor);
      petInicial = {
        id: data.id,
        rotulo: data.nome,
        detalhe: dono ? `Tutor: ${dono.nome}` : data.especie,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Nova assinatura"
        subtitulo="O tutor passa a pagar o plano todo mês"
      />
      <Card>
        {planos.length === 0 ? (
          <EmptyState
            icone={<ClipboardList className="size-7" strokeWidth={1.8} />}
            titulo="Nenhum plano ativo"
            mensagem="Cadastre um plano antes de criar assinaturas. Ex.: Plano Banho Mensal: 4 banhos + 1 tosa higiênica por R$ 189/mês."
            acao={
              usuario.papel === "admin" ? (
                <ButtonLink href="/planos/novo">Cadastrar plano</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <AssinaturaForm
            planos={planos}
            planoInicial={plano}
            tutorInicial={tutorInicial}
            petInicial={petInicial}
            erro={erro}
          />
        )}
      </Card>
    </div>
  );
}
