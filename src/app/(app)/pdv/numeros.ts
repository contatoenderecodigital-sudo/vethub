/**
 * Conversões de número do PDV. Ficam fora de actions.ts (que é "use server"
 * e só pode exportar funções assíncronas) e fora dos componentes, porque
 * cliente e servidor precisam exatamente das MESMAS regras.
 */

/** Converte texto pt-BR ("1.234,56" ou "12,5") ou padrão ("12.5") em número. */
export function paraNumero(texto: string): number {
  const t = String(texto ?? "").trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Igual a paraNumero, mas devolve 0 no lugar de NaN (para somas na tela). */
export function numeroOuZero(texto: string): number {
  const n = paraNumero(texto);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Máscara de moeda digitando da direita para a esquerda: "123456" → "1.234,56".
 * O sinal de menos (inclusive o "−" do teclado numérico) não entra: dinheiro
 * negativo não existe no PDV e o zod do servidor barra o que vier por fora.
 */
export function mascaraMoeda(v: string): string {
  const digitos = v.replace(/[-−–—]/g, "").replace(/\D/g, "").slice(0, 9); // até 9.999.999,00
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  const [inteiro, decimal] = centavos.split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/** Número → texto do input de moeda ("1234.5" → "1.234,50"). */
export function textoMoeda(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Quantidade sem casas sobrando: 2 → "2"; 1,5 → "1,5". */
export function textoQuantidade(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Arredonda para 2 casas. O banco é numeric(12,2). */
export function centavos(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Arredonda para 3 casas. Quantidade é numeric(12,3). */
export function milesimos(n: number): number {
  return Math.round(n * 1000) / 1000;
}
