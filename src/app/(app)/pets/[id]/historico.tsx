import Link from "next/link";
import {
  Bath,
  BedDouble,
  ClipboardList,
  Pill,
  Scale,
  ShoppingCart,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { rotuloVia } from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Tudo que já foi feito com este pet, em uma linha do tempo só.
 *
 * A ficha mostrava consultas, receitas e vacinas em cartões separados, e o
 * que aconteceu DURANTE uma internação não aparecia em lugar nenhum: quem
 * quisesse saber o que foi aplicado no bicho tinha que abrir a internação,
 * abrir cada prescrição e conferir horário por horário.
 *
 * Aqui tudo vira evento e desce em ordem de data: consulta, internação,
 * medicamento aplicado, vacina, receita, banho e tosa, procedimento vendido
 * e pesagem. É a pergunta que o veterinário faz de verdade — "o que já deram
 * pra ele?" — respondida numa tela só.
 */

type Genero = "consulta" | "internacao" | "medicamento" | "protocolo" | "receita" | "banho" | "venda" | "peso";

interface Evento {
  chave: string;
  quando: string;
  genero: Genero;
  titulo: string;
  detalhe?: string | null;
  /** Contexto de onde o evento aconteceu ("Internação · Box 2"). */
  origem?: string | null;
  href?: string;
}

const APARENCIA: Record<Genero, { icone: typeof Pill; rotulo: string }> = {
  consulta: { icone: Stethoscope, rotulo: "Consulta" },
  internacao: { icone: BedDouble, rotulo: "Internação" },
  medicamento: { icone: Pill, rotulo: "Medicação" },
  protocolo: { icone: Syringe, rotulo: "Vacina" },
  receita: { icone: ClipboardList, rotulo: "Receita" },
  banho: { icone: Bath, rotulo: "Banho e tosa" },
  venda: { icone: ShoppingCart, rotulo: "Procedimento" },
  peso: { icone: Scale, rotulo: "Peso" },
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const soData = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

/** Quantos eventos a tela mostra antes de virar rolagem infinita de nada útil. */
const TETO = 60;

/** O que cada consulta ao banco devolve. O aninhado precisa ser declarado. */
interface AplicacaoLinha {
  id: string;
  horario_realizado: string | null;
  status: string;
}
interface PrescricaoLinha {
  id: string;
  medicamento: string;
  dose: string;
  via: string | null;
  aplicacoes: AplicacaoLinha[] | null;
}
interface InternacaoLinha {
  id: string;
  box: string | null;
  motivo: string;
  diagnostico: string | null;
  status: string;
  data_entrada: string;
  data_saida: string | null;
  prescricoes: PrescricaoLinha[] | null;
}
interface ProtocoloLinha {
  id: string;
  tipo: string;
  nome: string;
  data_aplicacao: string;
  proxima_dose: string | null;
  fabricante: string | null;
}
interface ReceitaLinha {
  id: string;
  data: string;
  tipo: string;
  itens: { medicamento: string; concentracao: string | null }[] | null;
}
interface BanhoLinha {
  id: string;
  inicio: string;
  servicos: string[] | null;
  observacoes: string | null;
}
interface PesagemLinha {
  id: string;
  peso: number;
  data: string;
}
interface ConsultaLinha {
  id: string;
  data: string;
  queixa: string | null;
  diagnostico: string | null;
}

export async function HistoricoDoPet({ petId }: { petId: string }) {
  const { supabase } = await getSessao();

  const [
    { data: internacoes },
    { data: protocolos },
    { data: receitas },
    { data: banhos },
    { data: pesagens },
    { data: consultas },
  ] = await Promise.all([
    supabase
      .from("internacao")
      .select(
        "id, box, motivo, diagnostico, status, data_entrada, data_saida, " +
          "prescricoes:prescricao (id, medicamento, dose, via, " +
          "aplicacoes:administracao_medicamento (id, horario_realizado, status))"
      )
      .eq("pet_id", petId)
      .order("data_entrada", { ascending: false })
      .returns<InternacaoLinha[]>(),
    supabase
      .from("protocolo_saude")
      .select("id, tipo, nome, data_aplicacao, proxima_dose, fabricante")
      .eq("pet_id", petId)
      .order("data_aplicacao", { ascending: false })
      .returns<ProtocoloLinha[]>(),
    supabase
      .from("receita")
      .select("id, data, tipo, itens:receita_item (medicamento, concentracao)")
      .eq("pet_id", petId)
      .order("data", { ascending: false })
      .returns<ReceitaLinha[]>(),
    supabase
      .from("execucao_banho_tosa")
      .select("id, inicio, servicos, observacoes")
      .eq("pet_id", petId)
      .order("inicio", { ascending: false })
      .returns<BanhoLinha[]>(),
    supabase
      .from("pesagem")
      .select("id, peso, data")
      .eq("pet_id", petId)
      .order("data", { ascending: false })
      .limit(12)
      .returns<PesagemLinha[]>(),
    supabase
      .from("consulta")
      .select("id, data, queixa, diagnostico")
      .eq("pet_id", petId)
      .order("data", { ascending: false })
      .returns<ConsultaLinha[]>(),
  ]);

  const eventos: Evento[] = [];

  for (const c of consultas ?? []) {
    eventos.push({
      chave: `c${c.id}`,
      quando: c.data,
      genero: "consulta",
      titulo: c.diagnostico || c.queixa || "Consulta",
      detalhe: c.diagnostico && c.queixa ? c.queixa : null,
      href: `/consultas/${c.id}`,
    });
  }

  for (const i of internacoes ?? []) {
    const onde = ["Internação", i.box].filter(Boolean).join(" · ");
    eventos.push({
      chave: `i${i.id}`,
      quando: i.data_entrada,
      genero: "internacao",
      titulo: `Entrada: ${i.motivo}`,
      detalhe: i.diagnostico,
      origem: i.box,
      href: `/internacao/${i.id}`,
    });
    if (i.data_saida) {
      eventos.push({
        chave: `a${i.id}`,
        quando: i.data_saida,
        genero: "internacao",
        titulo: i.status === "obito" ? "Óbito" : "Alta da internação",
        origem: i.box,
        href: `/internacao/${i.id}`,
      });
    }

    // O que foi REALMENTE aplicado, e não o que foi prescrito: prescrição é
    // intenção, aplicação é o que aconteceu com o animal. É esta a resposta
    // para "o que deram pra ele enquanto estava internado".
    for (const p of i.prescricoes ?? []) {
      for (const ap of p.aplicacoes ?? []) {
        if (ap.status !== "aplicado" || !ap.horario_realizado) continue;
        eventos.push({
          chave: `m${ap.id}`,
          quando: ap.horario_realizado,
          genero: "medicamento",
          titulo: p.medicamento,
          detalhe: [p.dose, rotuloVia(p.via)].filter(Boolean).join(" · "),
          origem: onde,
          href: `/internacao/${i.id}`,
        });
      }
    }
  }

  for (const p of protocolos ?? []) {
    eventos.push({
      chave: `p${p.id}`,
      quando: `${p.data_aplicacao}T09:00:00`,
      genero: "protocolo",
      titulo: p.nome,
      detalhe: [
        p.tipo === "vacina" ? "Vacina" : p.tipo === "vermifugo" ? "Vermífugo" : "Antiparasitário",
        p.fabricante,
        p.proxima_dose ? `próxima em ${soData(p.proxima_dose)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  for (const r of receitas ?? []) {
    const lista = (r.itens ?? [])
      .map((m) => [m.medicamento, m.concentracao].filter(Boolean).join(" "))
      .join(", ");
    eventos.push({
      chave: `r${r.id}`,
      quando: `${r.data}T10:00:00`,
      genero: "receita",
      titulo: lista || "Receita emitida",
      detalhe: r.tipo === "controlada" ? "Receita controlada" : null,
      href: `/receitas/${r.id}`,
    });
  }

  for (const b of banhos ?? []) {
    eventos.push({
      chave: `b${b.id}`,
      quando: b.inicio,
      genero: "banho",
      titulo: (b.servicos ?? []).join(", ") || "Banho e tosa",
      detalhe: b.observacoes,
    });
  }

  for (const pe of pesagens ?? []) {
    eventos.push({
      chave: `w${pe.id}`,
      quando: `${pe.data}T08:00:00`,
      genero: "peso",
      titulo: `${Number(pe.peso).toLocaleString("pt-BR")} kg`,
    });
  }

  eventos.sort((a, b) => (a.quando < b.quando ? 1 : -1));
  const mostrados = eventos.slice(0, TETO);

  return (
    <Card>
      <CardTitulo>Histórico completo</CardTitulo>

      {mostrados.length === 0 ? (
        <EmptyState
          icone={<ClipboardList className="size-7" strokeWidth={1.8} />}
          titulo="Nada registrado ainda"
          mensagem="Consultas, medicações, vacinas, banhos e procedimentos aparecem aqui em ordem de data."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            Tudo que já foi feito com este pet, do mais recente ao mais antigo,
            inclusive o que foi aplicado durante internações.
          </p>

          <ol className="relative ml-3 space-y-3 border-l border-edge pl-6">
            {mostrados.map((e) => {
              const { icone: Icone, rotulo } = APARENCIA[e.genero];
              const miolo = (
                <>
                  <span className="glass absolute top-0.5 -left-[37px] flex size-6 items-center justify-center rounded-full">
                    <Icone className="size-3" strokeWidth={2} aria-hidden />
                  </span>
                  <p className="text-xs text-ink-muted">
                    {dataHora(e.quando)} · {rotulo}
                    {e.origem && ` · ${e.origem}`}
                  </p>
                  <p className="font-medium text-ink">{e.titulo}</p>
                  {e.detalhe && <p className="text-sm text-ink-muted">{e.detalhe}</p>}
                </>
              );

              return (
                <li key={e.chave} className="relative">
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-white/15"
                    >
                      {miolo}
                    </Link>
                  ) : (
                    <div className="py-1">{miolo}</div>
                  )}
                </li>
              );
            })}
          </ol>

          {eventos.length > TETO && (
            <p className="mt-3 text-sm text-ink-muted">
              Mostrando os {TETO} mais recentes de {eventos.length}.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
