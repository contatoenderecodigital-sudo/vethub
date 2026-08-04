/**
 * Teste de isolamento de tenant (VetHub).
 *
 * Cria duas clínicas com um usuário cada, insere dados em ambas e
 * confirma que um usuário NUNCA lê, insere, altera ou apaga dados
 * da outra clínica. Se qualquer asserção aqui falhar, o RLS está
 * quebrado e NADA deve ir para produção.
 *
 * Requer .env.local com:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * Rodar: npm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const temEnv = Boolean(url && anonKey && serviceKey);

const senha = "Teste-Isolamento-123!";
const rand = () => crypto.randomUUID().slice(0, 8);

describe.skipIf(!temEnv)("isolamento de tenant (RLS)", () => {
  let admin: SupabaseClient;
  let clienteA: SupabaseClient;
  let clienteB: SupabaseClient;

  let clinicaA: string;
  let clinicaB: string;
  let userA: string;
  let userB: string;
  let tutorB: string;
  let orcamentoB: string;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // duas clínicas
    const { data: clinicas, error: errClinicas } = await admin
      .from("clinica")
      .insert([{ nome: `Clínica A ${rand()}` }, { nome: `Clínica B ${rand()}` }])
      .select("id, nome");
    if (errClinicas) throw errClinicas;
    clinicaA = clinicas!.find((c) => c.nome.startsWith("Clínica A"))!.id;
    clinicaB = clinicas!.find((c) => c.nome.startsWith("Clínica B"))!.id;

    // um usuário em cada clínica
    const emailA = `iso-a-${rand()}@vethub-teste.dev`;
    const emailB = `iso-b-${rand()}@vethub-teste.dev`;

    const resA = await admin.auth.admin.createUser({
      email: emailA,
      password: senha,
      email_confirm: true,
    });
    if (resA.error) throw resA.error;
    userA = resA.data.user.id;

    const resB = await admin.auth.admin.createUser({
      email: emailB,
      password: senha,
      email_confirm: true,
    });
    if (resB.error) throw resB.error;
    userB = resB.data.user.id;

    const { error: errUsuarios } = await admin.from("usuario").insert([
      { id: userA, clinica_id: clinicaA, nome: "User A", email: emailA, papel: "admin" },
      { id: userB, clinica_id: clinicaB, nome: "User B", email: emailB, papel: "admin" },
    ]);
    if (errUsuarios) throw errUsuarios;

    // um tutor em cada clínica
    const { data: tutores, error: errTutores } = await admin
      .from("tutor")
      .insert([
        { clinica_id: clinicaA, nome: "Tutor da A", telefone: "11999990000" },
        { clinica_id: clinicaB, nome: "Tutor da B", telefone: "11999991111" },
      ])
      .select("id, clinica_id");
    if (errTutores) throw errTutores;
    tutorB = tutores!.find((t) => t.clinica_id === clinicaB)!.id;

    // um orçamento na clínica B (para testar orcamento_item, que não tem clinica_id)
    const { data: pets, error: errPet } = await admin
      .from("pet")
      .insert([{ clinica_id: clinicaB, tutor_id: tutorB, nome: "Pet da B", especie: "Cachorro" }])
      .select("id");
    if (errPet) throw errPet;
    const { data: orc, error: errOrc } = await admin
      .from("orcamento")
      .insert([{ clinica_id: clinicaB, pet_id: pets![0].id }])
      .select("id");
    if (errOrc) throw errOrc;
    orcamentoB = orc![0].id;

    // logins
    clienteA = createClient(url!, anonKey!, { auth: { persistSession: false } });
    clienteB = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const loginA = await clienteA.auth.signInWithPassword({ email: emailA, password: senha });
    if (loginA.error) throw loginA.error;
    const loginB = await clienteB.auth.signInWithPassword({ email: emailB, password: senha });
    if (loginB.error) throw loginB.error;
  }, 60_000);

  afterAll(async () => {
    // limpeza: apagar usuários do auth e clínicas (cascade leva o resto)
    if (admin) {
      if (userA) await admin.auth.admin.deleteUser(userA);
      if (userB) await admin.auth.admin.deleteUser(userB);
      if (clinicaA) await admin.from("clinica").delete().eq("id", clinicaA);
      if (clinicaB) await admin.from("clinica").delete().eq("id", clinicaB);
    }
  }, 60_000);

  it("usuário A só enxerga a própria clínica", async () => {
    const { data, error } = await clienteA.from("clinica").select("id");
    expect(error).toBeNull();
    expect(data!.map((c) => c.id)).toEqual([clinicaA]);
  });

  it("usuário A não lê tutor da clínica B (nem por id direto)", async () => {
    const lista = await clienteA.from("tutor").select("id, clinica_id");
    expect(lista.error).toBeNull();
    expect(lista.data!.every((t) => t.clinica_id === clinicaA)).toBe(true);

    const direto = await clienteA.from("tutor").select("id").eq("id", tutorB);
    expect(direto.error).toBeNull();
    expect(direto.data).toHaveLength(0); // RLS esconde a linha
  });

  it("usuário A não insere tutor na clínica B", async () => {
    const { error } = await clienteA
      .from("tutor")
      .insert({ clinica_id: clinicaB, nome: "Invasor", telefone: "0" });
    expect(error).not.toBeNull(); // viola a policy with check
  });

  it("usuário A não altera nem apaga tutor da clínica B", async () => {
    const upd = await clienteA
      .from("tutor")
      .update({ nome: "Hackeado" })
      .eq("id", tutorB)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0); // nenhuma linha visível para alterar

    const del = await clienteA.from("tutor").delete().eq("id", tutorB).select("id");
    expect(del.data ?? []).toHaveLength(0);

    // confirma que o tutor da B continua intacto
    const check = await admin.from("tutor").select("nome").eq("id", tutorB).single();
    expect(check.data!.nome).toBe("Tutor da B");
  });

  it("usuário A não lê nem insere orcamento_item da clínica B", async () => {
    const ins = await clienteA
      .from("orcamento_item")
      .insert({ orcamento_id: orcamentoB, descricao: "Invasão", quantidade: 1, valor_unitario: 10 });
    expect(ins.error).not.toBeNull();

    const sel = await clienteA.from("orcamento_item").select("id").eq("orcamento_id", orcamentoB);
    expect(sel.data ?? []).toHaveLength(0);
  });

  it("usuário B enxerga os próprios dados normalmente", async () => {
    const { data, error } = await clienteB.from("tutor").select("id");
    expect(error).toBeNull();
    expect(data!.map((t) => t.id)).toContain(tutorB);
  });

  it("anon (sem login) não lê nada", async () => {
    const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { data } = await anon.from("tutor").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});

if (!temEnv) {
  console.warn(
    "⚠ Teste de isolamento pulado: configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY em .env.local"
  );
}
