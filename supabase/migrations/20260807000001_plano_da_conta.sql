-- ============================================================
-- O plano que a CLÍNICA paga ao VetHub
--
-- Cuidado com o nome: o sistema já tem um módulo "Planos", que é outra
-- coisa — é o plano de saúde que a clínica VENDE ao tutor (tabela `plano`,
-- com `tutor_id` e `pet_id`). Este aqui é o contrário: é o que a clínica
-- paga para usar o VetHub. Por isso ele mora numa coluna da própria clínica
-- e é chamado de "plano da conta" em todo lugar.
--
-- A coluna `plano` já existia desde a primeira migração, com default
-- 'trial', e nunca foi lida por nada. Aqui ela ganha significado: valores
-- fechados por constraint, para não virar texto livre com 'Profissional',
-- 'profissional ' e 'PRO' convivendo no banco.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Os valores válidos
-- ------------------------------------------------------------
-- Clínicas antigas (todas em 'trial') seguem válidas: trial faz parte da
-- lista de propósito, é o estado de quem acabou de se cadastrar.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinica_plano_check'
  ) then
    alter table public.clinica add constraint clinica_plano_check
      check (plano in ('trial', 'essencial', 'profissional', 'completo'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Até quando o teste vale
-- ------------------------------------------------------------
-- Sem data, "trial" seria um plano gratuito para sempre. Com data, o
-- sistema sabe quando cobrar — e quem já está no banco ganha 14 dias a
-- partir de agora, não a partir do cadastro, para ninguém expirar de
-- surpresa no dia em que isto for aplicado.
alter table public.clinica
  add column if not exists trial_termina_em date;

update public.clinica
   set trial_termina_em = (now() at time zone 'America/Sao_Paulo')::date + 14
 where plano = 'trial'
   and trial_termina_em is null;

-- ------------------------------------------------------------
-- 3. Teto de usuários
-- ------------------------------------------------------------
-- O limite VEM do plano (está no mapa em src/lib/plano-conta.ts), mas fica
-- guardado aqui também porque negociação existe: uma clínica pode fechar o
-- Profissional com 8 usuários em vez de 5. Nulo significa "usa o limite do
-- plano", que é o caso normal.
alter table public.clinica
  add column if not exists limite_usuarios integer
    check (limite_usuarios is null or limite_usuarios > 0);

comment on column public.clinica.plano is
  'Plano da conta no VetHub (o que a clínica PAGA). Não confundir com a tabela plano, que é o plano de saúde vendido ao tutor.';
comment on column public.clinica.trial_termina_em is
  'Último dia do teste gratuito. Só faz sentido quando plano = trial.';
comment on column public.clinica.limite_usuarios is
  'Teto negociado de usuários. Nulo = usa o teto padrão do plano.';

-- ------------------------------------------------------------
-- 4. Quem pode mudar o plano
-- ------------------------------------------------------------
-- Ninguém pela aplicação. Um admin da clínica que pudesse gravar
-- `plano = 'completo'` liberaria tudo de graça com uma requisição — e o
-- update de clínica é uma operação legítima que o admin faz para trocar
-- telefone e endereço. Então a coluna fica de fora do que o RLS permite
-- escrever, e a troca acontece pelo service_role (cobrança, painel do dono).
create or replace function public.plano_nao_muda_pela_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `auth.role()` é 'service_role' quando a chamada vem do servidor com a
  -- chave de serviço: a cobrança e o painel do dono passam por aqui.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.plano is distinct from old.plano
     or new.trial_termina_em is distinct from old.trial_termina_em
     or new.limite_usuarios is distinct from old.limite_usuarios then
    raise exception 'O plano da conta não pode ser alterado por aqui.';
  end if;

  return new;
end $$;

drop trigger if exists trg_plano_nao_muda on public.clinica;
create trigger trg_plano_nao_muda
  before update on public.clinica
  for each row
  execute function public.plano_nao_muda_pela_aplicacao();
