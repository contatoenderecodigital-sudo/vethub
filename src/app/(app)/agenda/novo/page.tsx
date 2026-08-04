import { getSessao } from "@/lib/auth";
import { emojiEspecie, hojeISO } from "@/lib/format";
import { TIPOS_AGENDAMENTO, type Pet, type Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Campo, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { BuscaCombobox, type OpcaoBusca } from "@/components/busca-combobox";
import { criarAgendamento } from "../actions";

export const metadata = { title: "Novo agendamento" };

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string; data?: string; erro?: string }>;
}) {
  const { pet, data, erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<Pick<Usuario, "id" | "nome">[]>();

  // Pet pré-selecionado (ex.: vindo da ficha do pet via ?pet=).
  let petInicial: OpcaoBusca | undefined;
  if (pet) {
    const { data: p } = await supabase
      .from("pet")
      .select("id, nome, especie")
      .eq("id", pet)
      .single<Pick<Pet, "id" | "nome" | "especie">>();
    if (p) {
      petInicial = { id: p.id, rotulo: `${emojiEspecie(p.especie)} ${p.nome}` };
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo agendamento" />
      <Card>
        <form action={criarAgendamento} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <Campo rotulo="Pet" obrigatorio>
            <BuscaCombobox
              name="pet_id"
              endpoint="/api/busca/pets"
              placeholder="Busque o pet pelo nome…"
              valorInicial={petInicial}
              obrigatorio
            />
          </Campo>

          <Campo rotulo="Veterinário" htmlFor="veterinario_id">
            <Select id="veterinario_id" name="veterinario_id" defaultValue="">
              <option value="">Sem preferência</option>
              {(veterinarios ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </Select>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Data" htmlFor="data" obrigatorio>
              <Input
                id="data"
                name="data"
                type="date"
                defaultValue={data ?? hojeISO()}
                required
              />
            </Campo>
            <Campo rotulo="Hora" htmlFor="hora" obrigatorio>
              <Input id="hora" name="hora" type="time" required />
            </Campo>
          </div>

          <Campo rotulo="Tipo" htmlFor="tipo" obrigatorio>
            <Select id="tipo" name="tipo" defaultValue="consulta" required>
              {TIPOS_AGENDAMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          <Campo rotulo="Observações" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              name="observacoes"
              placeholder="Ex.: chegar 10 min antes, pet em jejum…"
            />
          </Campo>

          <div className="flex gap-2 pt-2">
            <SubmitButton carregando="Agendando…">Agendar</SubmitButton>
            <ButtonLink href="/agenda" variante="secondary">
              Cancelar
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
