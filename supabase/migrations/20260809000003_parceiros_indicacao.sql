-- ============================================================
-- Quem indicou cada clínica
-- ============================================================
--
-- O dono vai pôr gente para indicar o VetHub, cada um com o seu link. Sem
-- registrar de onde veio a clínica, no fim do mês a conversa vira "eu que
-- trouxe essa" contra "não foi você" — e não existe nada no sistema para
-- resolver a discussão.
--
-- A marca é gravada NO MOMENTO DO CADASTRO e nunca mais muda: indicação é
-- fato histórico, não campo editável. Se pudesse ser trocada depois, o
-- registro perderia justamente o valor de ser prova.

create table if not exists public.parceiro (
  id uuid primary key default gen_random_uuid(),

  nome text not null,

  -- O que vai no link: /cadastro?ref=CODIGO. Curto e sem acento, porque é
  -- digitado à mão e falado por telefone.
  codigo text not null unique,

  telefone text,
  email text,
  documento text,

  -- Quanto o parceiro recebe sobre o que a clínica indicada paga.
  comissao_percentual numeric(5, 2) not null default 20
    check (comissao_percentual >= 0 and comissao_percentual <= 100),

  -- Por quantos meses a comissão vale a partir da assinatura. Nulo = para
  -- sempre, que é o modelo de quem indica e continua atendendo o cliente.
  meses_de_comissao integer check (meses_de_comissao is null or meses_de_comissao > 0),

  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.parceiro is
  'Quem indica clínicas para o VetHub. Cada um tem seu código de link. Tabela do DONO, não das clínicas.';

-- ------------------------------------------------------------
-- A marca na clínica
-- ------------------------------------------------------------
alter table public.clinica
  add column if not exists parceiro_id uuid references public.parceiro (id) on delete set null;

-- O código exatamente como veio no link, mesmo que o parceiro seja apagado
-- depois. Guardar só a chave estrangeira perderia a origem no dia em que
-- alguém removesse o parceiro — e a pergunta "de onde veio essa clínica?"
-- continuaria valendo.
alter table public.clinica
  add column if not exists origem_ref text;

create index if not exists idx_clinica_parceiro on public.clinica (parceiro_id);

comment on column public.clinica.parceiro_id is
  'Quem indicou esta clínica. Gravado no cadastro e não muda depois.';
comment on column public.clinica.origem_ref is
  'O código do link como veio na URL, preservado mesmo se o parceiro for removido.';

-- ------------------------------------------------------------
-- Quem enxerga
-- ------------------------------------------------------------
-- NINGUÉM, pelo aplicativo. A tabela é do dono do VetHub, não das clínicas:
-- uma clínica não tem por que saber que existem parceiros, quanto eles
-- ganham ou quem mais foi indicado. O painel do dono lê com `service_role`,
-- que ignora RLS por definição.
--
-- RLS ligada sem nenhuma policy é o jeito mais forte de dizer isso: qualquer
-- consulta autenticada volta vazia, mesmo que alguém erre e exponha a tabela
-- numa rota nova.
alter table public.parceiro enable row level security;

grant all privileges on public.parceiro to service_role;
revoke all on public.parceiro from authenticated;

drop trigger if exists trg_parceiro_updated on public.parceiro;
create trigger trg_parceiro_updated
  before update on public.parceiro
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- O plano da conta já era protegido; o parceiro entra na mesma regra
-- ------------------------------------------------------------
-- Uma clínica que pudesse gravar `parceiro_id` em si mesma escolheria quem
-- ganha a comissão dela — ou tiraria a comissão de quem a trouxe.
create or replace function public.plano_nao_muda_pela_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.plano is distinct from old.plano
     or new.trial_termina_em is distinct from old.trial_termina_em
     or new.limite_usuarios is distinct from old.limite_usuarios
     or new.ciclo is distinct from old.ciclo
     or new.renova_em is distinct from old.renova_em
     or new.parceiro_id is distinct from old.parceiro_id
     or new.origem_ref is distinct from old.origem_ref then
    raise exception 'O plano da conta não pode ser alterado por aqui.';
  end if;

  return new;
end $$;
