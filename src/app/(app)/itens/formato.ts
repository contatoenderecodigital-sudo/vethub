/**
 * Máscaras e conversões numéricas do módulo de itens e estoque.
 * Regra: o usuário digita no padrão pt-BR (1.234,56) e o banco recebe
 * número com ponto decimal. O servidor sempre reconverte com estas
 * mesmas funções — nunca confiar no que veio do front.
 */

/**
 * Remove qualquer sinal negativo digitado ou colado — inclusive o "−" (U+2212)
 * do teclado numérico e os travessões que vêm de planilha. Dinheiro e
 * quantidade no VetHub nunca são negativos: a máscara não deixa o sinal entrar
 * e o zod do servidor barra o que passar por fora do formulário.
 */
export function semSinal(texto: string): string {
  return texto.replace(/[-−–—]/g, "");
}

/** Máscara de moeda: só dígitos → centavos → "1.234,56". Nunca aceita sinal. */
export function mascaraMoeda(v: string): string {
  const digitos = semSinal(v).replace(/\D/g, "").slice(0, 9); // até 9.999.999,99
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  const [inteiro, decimal] = centavos.split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/** Número vindo do banco → texto com máscara de moeda ("89,90"). */
export function moedaDoBanco(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  if (!Number.isFinite(n)) return "";
  return mascaraMoeda(Math.round(n * 100).toString());
}

/**
 * Texto pt-BR ("1.234,56") ou padrão ("12.5") → número.
 * Vazio vira null; ilegível vira NaN (o zod barra antes de salvar).
 */
export function paraNumero(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Mantém só dígitos, vírgula e ponto (aplicada no onChange das quantidades).
 * O sinal de menos cai junto — quantidade negativa não existe por aqui.
 */
export function sanitizarNumero(texto: string, maxChars = 10): string {
  return semSinal(texto).replace(/[^\d.,]/g, "").slice(0, maxChars);
}

/** Só dígitos, para minutos e outros inteiros. */
export function sanitizarInteiro(texto: string, maxChars = 5): string {
  return texto.replace(/\D/g, "").slice(0, maxChars);
}

/** Quantidade de estoque no padrão pt-BR, com a sigla da unidade. */
export function formatQuantidade(
  valor: number | string | null | undefined,
  sigla?: string | null
): string {
  const n = typeof valor === "string" ? parseFloat(valor) : (valor ?? 0);
  if (!Number.isFinite(n)) return "—";
  const texto = n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return sigla ? `${texto} ${sigla}` : texto;
}

/** Percentual no padrão pt-BR: "12,5%". */
export function formatPercentual(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? parseFloat(valor) : (valor ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/**
 * Termo de busca seguro para o `.or()` do PostgREST — vírgula e
 * parênteses quebram a sintaxe do filtro, e `%`/`_` viram curinga.
 */
export function sanitizarBusca(termo: string): string {
  return termo.replace(/[,()%_*\\]/g, " ").trim().slice(0, 60);
}

/** Produto que já bateu (ou passou de) o estoque mínimo. */
export function abaixoDoMinimo(item: {
  controla_estoque: boolean;
  estoque_atual: number;
  estoque_minimo: number;
}): boolean {
  return (
    item.controla_estoque && Number(item.estoque_atual) <= Number(item.estoque_minimo)
  );
}
