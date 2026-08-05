"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";

/**
 * Gráficos do VetHub (Recharts) no visual de vidro: eixos e grade em
 * branco translúcido, séries com degradê vertical e dica de valor
 * dentro de um cartão de vidro.
 *
 * A paleta das séries é fixa e clara (ver CORES_SERIE): o fundo da tela
 * é o degradê do tema, então série na cor do tema desapareceria nele.
 */

/**
 * Paleta das séries.
 *
 * NÃO usa as cores do tema de propósito: o fundo do sistema é o próprio
 * degradê do tema, então uma série na cor do tema desaparece dentro dele
 * (o roxo some no roxo). Estas são cores claras e saturadas, escolhidas
 * para saltar sobre qualquer fundo colorido — verde, azul, roxo ou
 * vermelho — mantendo contraste de leitura.
 */
export const CORES_SERIE = [
  "#fcd34d", // âmbar
  "#5eead4", // turquesa
  "#fda4af", // rosa
  "#bef264", // limão
  "#a5b4fc", // lavanda
  "#fdba74", // laranja
] as const;

const EIXO = {
  stroke: "rgb(255 255 255 / 0.8)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Grade discreta, mas visível o bastante para servir de referência. */
const COR_GRADE = "rgb(255 255 255 / 0.22)";

type Formato = "moeda" | "numero";

const formatar = (v: number, formato: Formato) =>
  formato === "moeda" ? formatBRL(v) : v.toLocaleString("pt-BR");

/** Números curtos no eixo: 1.2 mil, 3,4 mi. */
function compacto(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR");
}

interface DicaProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  formato: Formato;
}

function Dica({ active, payload, label, formato }: DicaProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-menu rounded-xl px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-white">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-white/90">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            {p.name && <span>{p.name}:</span>}
            <span className="font-semibold tabular-nums">
              {formatar(p.value ?? 0, formato)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BaseProps {
  dados: Record<string, string | number>[];
  eixoX: string;
  altura?: number;
  formato?: Formato;
}

/** Barras verticais com degradê — bom para comparar meses ou categorias. */
export function GraficoBarras({
  dados,
  eixoX,
  series,
  altura = 260,
  formato = "numero",
  empilhado = false,
}: BaseProps & {
  series: { chave: string; rotulo: string; cor?: string }[];
  empilhado?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const cor = s.cor ?? CORES_SERIE[i % CORES_SERIE.length];
            return (
              <linearGradient key={s.chave} id={`barra-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.95} />
                <stop offset="100%" stopColor={cor} stopOpacity={0.6} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COR_GRADE} vertical={false} />
        <XAxis dataKey={eixoX} {...EIXO} />
        <YAxis {...EIXO} tickFormatter={compacto} width={52} />
        <Tooltip
          cursor={{ fill: "rgb(255 255 255 / 0.08)" }}
          content={<Dica formato={formato} />}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: "rgb(255 255 255 / 0.85)" }}
            iconType="circle"
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            name={s.rotulo}
            fill={`url(#barra-${s.chave})`}
            radius={[6, 6, 0, 0]}
            stackId={empilhado ? "pilha" : undefined}
            maxBarSize={56}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Área com degradê — bom para evolução no tempo (faturamento, atendimentos). */
export function GraficoArea({
  dados,
  eixoX,
  series,
  altura = 260,
  formato = "numero",
}: BaseProps & { series: { chave: string; rotulo: string; cor?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const cor = s.cor ?? CORES_SERIE[i % CORES_SERIE.length];
            return (
              <linearGradient key={s.chave} id={`area-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.85} />
                <stop offset="100%" stopColor={cor} stopOpacity={0.12} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COR_GRADE} vertical={false} />
        <XAxis dataKey={eixoX} {...EIXO} />
        <YAxis {...EIXO} tickFormatter={compacto} width={52} />
        <Tooltip
          cursor={{ stroke: "rgb(255 255 255 / 0.3)" }}
          content={<Dica formato={formato} />}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: "rgb(255 255 255 / 0.85)" }}
            iconType="circle"
          />
        )}
        {series.map((s, i) => {
          const cor = s.cor ?? CORES_SERIE[i % CORES_SERIE.length];
          return (
            <Area
              key={s.chave}
              type="monotone"
              dataKey={s.chave}
              name={s.rotulo}
              stroke={cor}
              strokeWidth={3}
              fill={`url(#area-${s.chave})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Linha simples — para acompanhar uma métrica só. */
export function GraficoLinha({
  dados,
  eixoX,
  chave,
  rotulo,
  altura = 240,
  formato = "numero",
}: BaseProps & { chave: string; rotulo: string }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COR_GRADE} vertical={false} />
        <XAxis dataKey={eixoX} {...EIXO} />
        <YAxis {...EIXO} tickFormatter={compacto} width={52} />
        <Tooltip content={<Dica formato={formato} />} />
        <Line
          type="monotone"
          dataKey={chave}
          name={rotulo}
          stroke={CORES_SERIE[0]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Rosca — participação por categoria (formas de pagamento, tipos de atendimento). */
export function GraficoRosca({
  dados,
  chaveRotulo,
  chaveValor,
  altura = 260,
  formato = "numero",
}: {
  dados: Record<string, string | number>[];
  chaveRotulo: string;
  chaveValor: string;
  altura?: number;
  formato?: Formato;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <PieChart>
        <defs>
          {CORES_SERIE.map((cor, i) => (
            <linearGradient key={i} id={`fatia-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.95} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.85} />
            </linearGradient>
          ))}
        </defs>
        <Pie
          data={dados}
          dataKey={chaveValor}
          nameKey={chaveRotulo}
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="rgb(255 255 255 / 0.25)"
          strokeWidth={1}
        >
          {dados.map((_, i) => (
            <Cell key={i} fill={`url(#fatia-${i % CORES_SERIE.length})`} />
          ))}
        </Pie>
        <Tooltip content={<Dica formato={formato} />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "rgb(255 255 255 / 0.85)" }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
