import Link from "next/link";
import {
  Bath,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form";
import { IconeEspecie } from "@/components/icone-especie";
import { rotuloTipoTosa, temperamentoInfo } from "../schema";
import { SeletorPetFicha } from "./seletor-pet";

export const metadata = { title: "Fichas de tosa" };

const LIMITE = 100;

interface FichaLista {
  id: string;
  pet_id: string;
  tipo_tosa: string | null;
  temperamento: string | null;
  restricoes: string | null;
  pet: {
    id: string;
    nome: string;
    especie: string;
    tutor: { nome: string } | null;
  } | null;
}

export default async function FichasBanhoTosaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>;
}) {
  const { q, erro } = await searchParams;
  const termo = q?.trim() ?? "";
  const { supabase } = await getSessao();

  /**
   * Busca por pet OU por tutor: primeiro resolvemos quais pets casam com o
   * termo (RLS já limita à clínica) e depois filtramos as fichas por eles.
   */
  let petIdsFiltro: string[] | null = null;
  if (termo) {
    const [{ data: petsPorNome }, { data: tutores }] = await Promise.all([
      supabase
        .from("pet")
        .select("id")
        .ilike("nome", `%${termo}%`)
        .limit(200)
        .returns<{ id: string }[]>(),
      supabase
        .from("tutor")
        .select("id")
        .ilike("nome", `%${termo}%`)
        .limit(200)
        .returns<{ id: string }[]>(),
    ]);

    const ids = (petsPorNome ?? []).map((p) => p.id);

    if (tutores && tutores.length > 0) {
      const { data: petsDoTutor } = await supabase
        .from("pet")
        .select("id")
        .in(
          "tutor_id",
          tutores.map((t) => t.id)
        )
        .limit(200)
        .returns<{ id: string }[]>();
      ids.push(...(petsDoTutor ?? []).map((p) => p.id));
    }

    petIdsFiltro = [...new Set(ids)];
  }

  let query = supabase
    .from("ficha_banho_tosa")
    .select(
      "id, pet_id, tipo_tosa, temperamento, restricoes, " +
        "pet:pet_id (id, nome, especie, tutor:tutor_id (nome))"
    )
    .order("updated_at", { ascending: false })
    .limit(LIMITE);

  if (petIdsFiltro) {
    // lista vazia → nenhum resultado (id impossível em vez de filtro vazio)
    query = query.in(
      "pet_id",
      petIdsFiltro.length > 0
        ? petIdsFiltro
        : ["00000000-0000-0000-0000-000000000000"]
    );
  }

  const { data: fichas } = await query.returns<FichaLista[]>();
  const lista = fichas ?? [];

  return (
    <div>
      <PageHeader
        titulo="Fichas de tosa"
        subtitulo={`${lista.length} ${lista.length === 1 ? "ficha" : "fichas"}${
          lista.length === LIMITE ? " (mais recentes)" : ""
        }`}
        acao={
          <ButtonLink href="/banho-tosa" variante="secondary" className="min-h-11">
            <Bath className="size-4" />
            Painel do dia
          </ButtonLink>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <Card className="mb-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
          <Plus className="size-4 text-ink-muted" aria-hidden />
          Nova ficha
        </p>
        <p className="mb-2 text-xs text-ink-muted">
          Escolha o pet para abrir (ou criar) a ficha de preferências dele.
        </p>
        <div className="sm:max-w-md">
          <SeletorPetFicha />
        </div>
      </Card>

      <form
        method="get"
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          type="search"
          name="q"
          defaultValue={termo}
          placeholder="Buscar por pet ou tutor…"
          className="min-h-11 sm:max-w-md"
        />
        <Button type="submit" variante="secondary" className="min-h-11">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {lista.length === 0 ? (
        <EmptyState
          icone={<ClipboardList className="size-7" strokeWidth={1.8} />}
          titulo={termo ? "Nenhuma ficha encontrada" : "Nenhuma ficha cadastrada"}
          mensagem={
            termo
              ? "Tente outro nome de pet ou de tutor."
              : "Cadastre as preferências dos pets (tipo de tosa, shampoo, restrições) para a equipe atender do jeito certo."
          }
        />
      ) : (
        <div className="glass rounded-2xl">
          <ul className="divide-y divide-white/15">
            {lista.map((f) => {
              const temperamento = temperamentoInfo(f.temperamento);
              const tosa = rotuloTipoTosa(f.tipo_tosa);
              return (
                <li key={f.id}>
                  <Link
                    href={`/banho-tosa/fichas/${f.pet_id}`}
                    className="mx-2 my-1 flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-white/15"
                  >
                    <IconeEspecie especie={f.pet?.especie} tamanho="sm" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate font-semibold text-ink">
                          {f.pet?.nome ?? "Pet removido"}
                        </p>
                        {tosa && <Badge tom="brand">{tosa}</Badge>}
                        {temperamento && (
                          <Badge tom={temperamento.alerta ? "pending" : "success"}>
                            {temperamento.rotulo}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        {f.pet?.tutor?.nome
                          ? `Tutor: ${f.pet.tutor.nome}`
                          : "Sem tutor"}
                      </p>
                      {f.restricoes && (
                        <p className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-50">
                          <TriangleAlert
                            className="mt-px size-3.5 shrink-0"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="line-clamp-2">{f.restricoes}</span>
                        </p>
                      )}
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
