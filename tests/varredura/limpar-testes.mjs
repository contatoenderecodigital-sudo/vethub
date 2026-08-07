/**
 * Apaga as clínicas que os testes criaram.
 *
 * `dinheiro.mjs` e `fluxos.mjs` criam uma clínica virgem por execução, de
 * propósito: comparar totais absolutos exige começar do zero. O preço é que
 * elas se acumulam no banco, com nome começando em `ZZ Robo`.
 *
 * Isto usa a `service_role` porque precisa passar por cima do isolamento —
 * é o único jeito de enxergar clínicas das quais não se é membro. Por isso
 * ele NUNCA apaga nada que não comece com o prefixo, e mostra a lista antes.
 *
 * Como rodar:
 *   node --env-file=.env.local tests/varredura/limpar-testes.mjs          (só lista)
 *   node --env-file=.env.local tests/varredura/limpar-testes.mjs --apagar (apaga)
 */

import { createClient } from "@supabase/supabase-js";

const PREFIXO = "ZZ Robo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("faltou NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const apagar = process.argv.includes("--apagar");
const admin = createClient(url, chave, { auth: { persistSession: false } });

const { data: clinicas, error } = await admin
  .from("clinica")
  .select("id, nome, created_at")
  .ilike("nome", `${PREFIXO}%`)
  .order("created_at");

if (error) throw new Error(`não consegui listar: ${error.message}`);

if (!clinicas?.length) {
  console.log("Nenhuma clínica de teste no banco.");
  process.exit(0);
}

// A clínica do VETHUB_EMAIL do .env.local é a que roda as baterias que
// dependem de login (varredura, design, conferir-banco). Apagá-la deixaria o
// ambiente sem conta de teste, então ela fica de fora da limpeza.
let protegida = null;
if (process.env.VETHUB_EMAIL) {
  const { data: eu } = await admin
    .from("usuario")
    .select("clinica_id")
    .eq("email", process.env.VETHUB_EMAIL.toLowerCase())
    .maybeSingle();
  protegida = eu?.clinica_id ?? null;
}

const alvos = clinicas.filter((c) => c.id !== protegida);

console.log(`${clinicas.length} clínica(s) de teste:\n`);
for (const c of clinicas) {
  const marca = c.id === protegida ? "  [EM USO — não será apagada]" : "";
  console.log(`  ${c.nome.padEnd(34)} ${String(c.created_at).slice(0, 19)}${marca}`);
}
console.log(`\n${alvos.length} seriam apagadas.`);

if (!apagar) {
  console.log("\nNada foi apagado. Rode com --apagar para remover.");
  process.exit(0);
}

// A clínica é a raiz de tudo: o `on delete cascade` das migrações leva junto
// tutores, pets, vendas, contas e o resto. Os usuários do auth ficam órfãos,
// então são apagados à parte.
let apagadas = 0;
for (const c of alvos) {
  const { data: usuarios } = await admin
    .from("usuario")
    .select("id, email")
    .eq("clinica_id", c.id);

  const { error: erroClinica } = await admin.from("clinica").delete().eq("id", c.id);
  if (erroClinica) {
    console.log(`  FALHOU ${c.nome}: ${erroClinica.message}`);
    continue;
  }

  for (const u of usuarios ?? []) {
    await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
  apagadas++;
  console.log(`  apagada ${c.nome} (+${(usuarios ?? []).length} usuário(s))`);
}

console.log(`\n${apagadas} de ${clinicas.length} apagada(s).`);
