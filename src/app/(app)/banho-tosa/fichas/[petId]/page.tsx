import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { FichaCard } from "../../ficha-card";
import type { FichaBanhoTosa } from "../../schema";

export const metadata = { title: "Ficha de banho e tosa" };

interface PetDaFicha {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  tutor: { id: string; nome: string } | null;
}

export default async function FichaDoPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { petId } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const [{ data: pet }, { data: ficha }] = await Promise.all([
    supabase
      .from("pet")
      .select("id, nome, especie, raca, tutor:tutor_id (id, nome)")
      .eq("id", petId)
      .maybeSingle<PetDaFicha>(),
    supabase
      .from("ficha_banho_tosa")
      .select(
        "id, pet_id, tipo_tosa, altura_maquina, shampoo, perfume, observacoes, restricoes, temperamento, updated_at"
      )
      .eq("pet_id", petId)
      .maybeSingle<FichaBanhoTosa>(),
  ]);

  if (!pet) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo={pet.nome}
        subtitulo={`Ficha de banho e tosa · ${pet.especie}${
          pet.raca ? ` · ${pet.raca}` : ""
        }`}
        acao={
          <>
            <ButtonLink
              href="/banho-tosa/fichas"
              variante="secondary"
              className="min-h-11"
            >
              <ArrowLeft className="size-4" />
              Fichas
            </ButtonLink>
            <ButtonLink href={`/pets/${pet.id}`} className="min-h-11">
              <PawPrint className="size-4" />
              Ficha do pet
            </ButtonLink>
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      {pet.tutor && (
        <p className="mb-4 text-sm text-ink-muted">
          Tutor:{" "}
          <Link
            href={`/tutores/${pet.tutor.id}`}
            className="text-brand-mint hover:underline"
          >
            {pet.tutor.nome}
          </Link>
        </p>
      )}

      <FichaCard
        petId={pet.id}
        petNome={pet.nome}
        ficha={ficha ?? null}
        destino={`/banho-tosa/fichas/${pet.id}`}
      />
    </div>
  );
}
