import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * O que fazer na primeira hora.
 *
 * O painel de uma clínica recém-cadastrada é uma parede de zeros: seis
 * indicadores em 0, três em R$ 0,00, um gráfico vazio e uma agenda livre.
 * Está tudo tecnicamente certo e não ajuda ninguém — quem acabou de entrar
 * não está procurando números, está procurando o que fazer primeiro.
 *
 * Esta lista some sozinha quando os cinco passos estão dados. Ela não pode
 * virar mobília na tela de quem já usa o sistema todo dia: aviso que não
 * some deixa de ser lido, e aí o próximo aviso, o que importa, também não é.
 *
 * Os passos estão na ordem em que a clínica realmente trabalha: primeiro
 * quem paga (o tutor), depois quem é atendido (o pet), depois o que se
 * cobra, e por fim a agenda. Os dados da clínica ficam por último de
 * propósito, porque é o único que não impede ninguém de atender hoje.
 */
export interface Passo {
  feito: boolean;
  titulo: string;
  descricao: string;
  href: string;
}

export function PrimeirosPassos({ passos }: { passos: Passo[] }) {
  const feitos = passos.filter((p) => p.feito).length;
  if (feitos === passos.length) return null;

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Comece por aqui</h2>
        <span className="text-sm text-ink-muted tabular-nums">
          {feitos} de {passos.length}
        </span>
      </div>

      {/* A barra existe para a pessoa ver que está andando. Sem ela, marcar
          o segundo passo de cinco não parece progresso nenhum. */}
      <div
        className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuenow={feitos}
        aria-valuemin={0}
        aria-valuemax={passos.length}
        aria-label="Passos concluídos"
      >
        <div
          className="h-full rounded-full bg-brand-mint transition-[width]"
          style={{ width: `${(feitos / passos.length) * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {passos.map((p) => (
          <li key={p.href}>
            {p.feito ? (
              // Feito não é mais um link: mandar a pessoa de volta a uma
              // tarefa concluída é ruído. Fica ali só para ela ver que andou.
              <span className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5">
                <Check
                  className="size-5 shrink-0 text-brand-mint"
                  strokeWidth={2.4}
                  aria-hidden
                />
                <span className="min-w-0 text-sm text-ink-muted line-through">
                  {p.titulo}
                </span>
              </span>
            ) : (
              <Link
                href={p.href}
                className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-4 py-1.5 transition-colors hover:bg-white/15"
              >
                <Circle
                  className="size-5 shrink-0 text-ink-muted"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{p.titulo}</span>
                  <span className="block text-sm text-ink-muted">{p.descricao}</span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-ink-muted"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
