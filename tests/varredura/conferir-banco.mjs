/**
 * Espia o banco pelos olhos da própria clínica (com RLS ligado).
 *
 * Serve de árbitro quando uma tela mostra um número estranho: aqui se vê o
 * que está gravado de verdade, sem passar por nenhuma tela. Se o banco e a
 * tela discordarem, o defeito é da tela; se o banco já estiver errado, o
 * defeito é do gravador.
 *
 * Usa a chave `anon` + login normal, então enxerga exatamente o que aquele
 * usuário enxergaria — nada de service_role passando por cima do isolamento.
 *
 * Como rodar:
 *   node --env-file=.env.local tests/varredura/conferir-banco.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.VETHUB_EMAIL;
const senha = process.env.VETHUB_SENHA;

if (!url || !anon) throw new Error("faltou NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
if (!email || !senha) throw new Error("faltou VETHUB_EMAIL / VETHUB_SENHA");

const sb = createClient(url, anon, { auth: { persistSession: false } });

const { error: erroLogin } = await sb.auth.signInWithPassword({ email, password: senha });
if (erroLogin) throw new Error(`login recusado: ${erroLogin.message}`);
console.log(`logado como ${email}\n`);

const dinheiro = (n) => Number(n ?? 0).toFixed(2);
const soma = (lista) => lista.reduce((s, x) => s + Number(x ?? 0), 0);

async function tabela(nome, colunas, limite = 20) {
  const { data, error } = await sb
    .from(nome)
    .select(colunas)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) {
    console.log(`=== ${nome.toUpperCase()} === erro: ${error.message}`);
    return [];
  }
  return data ?? [];
}

// `valor_total`, não `total`: a coluna é essa desde a migração do PDV.
const vendas = await tabela("venda", "id,subtotal,desconto,valor_total,status,created_at");
console.log(`=== VENDAS (${vendas.length}) ===`);
vendas.forEach((v) =>
  console.log(
    `  total=${dinheiro(v.valor_total)} (subtotal ${dinheiro(v.subtotal)} − desconto ${dinheiro(v.desconto)}) ` +
      `status=${v.status} ${String(v.created_at).slice(0, 19)}`
  )
);

const compras = await tabela("compra", "id,valor_total,frete,parcelas,prazo_dias,status,data");
console.log(`\n=== COMPRAS (${compras.length}) ===`);
compras.forEach((c) =>
  console.log(
    `  total=${dinheiro(c.valor_total)} frete=${dinheiro(c.frete)} ` +
      `${c.parcelas}x em ${c.prazo_dias}d status=${c.status} ${c.data}`
  )
);
if (compras.some((c) => c.status === "pendente")) {
  console.log(
    "  nota: compra 'pendente' ainda NÃO gerou estoque nem conta a pagar —\n" +
      "        isso só acontece em 'Receber mercadoria'."
  );
}

const contas = await tabela(
  "conta",
  "id,tipo,valor,valor_pago,status,origem,competencia,vencimento"
);
console.log(`\n=== CONTAS (${contas.length}) ===`);
contas.forEach((c) =>
  console.log(
    `  ${c.tipo.padEnd(7)} valor=${dinheiro(c.valor)} pago=${dinheiro(c.valor_pago)} ` +
      `status=${String(c.status).padEnd(7)} origem=${c.origem} comp=${c.competencia}`
  )
);

const baixas = await tabela("baixa", "valor,data,forma_pagamento");
console.log(`\n=== BAIXAS (${baixas.length}) ===`);
baixas.forEach((b) => console.log(`  ${dinheiro(b.valor)} em ${b.data} via ${b.forma_pagamento}`));

const receber = contas.filter((c) => c.tipo === "receber");
console.log("\n=== TOTAIS (o que as telas deveriam mostrar) ===");
console.log(`  vendido / competência : ${dinheiro(soma(receber.map((c) => c.valor)))}`);
console.log(`  entrou / caixa        : ${dinheiro(soma(baixas.map((b) => b.valor)))}`);
console.log(
  `  em aberto (a receber) : ${dinheiro(
    soma(receber.map((c) => Number(c.valor) - Number(c.valor_pago ?? 0)))
  )}`
);
