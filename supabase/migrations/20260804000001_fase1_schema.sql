-- ============================================================
-- VetHub — Fase 1: esquema inicial
-- Toda tabela de negócio carrega clinica_id (isolamento multi-tenant).
-- ============================================================

-- Trigger genérico de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- clinica: o tenant
-- ------------------------------------------------------------
create table public.clinica (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  endereco text,
  plano text not null default 'trial',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_clinica_updated_at
  before update on public.clinica
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- usuario: perfil do usuário autenticado (1:1 com auth.users)
-- ------------------------------------------------------------
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null check (papel in ('admin', 'veterinario', 'recepcao')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_usuario_clinica on public.usuario (clinica_id);

create trigger trg_usuario_updated_at
  before update on public.usuario
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- tutor: dono do pet (dado pessoal — LGPD)
-- ------------------------------------------------------------
create table public.tutor (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  nome text not null,
  cpf text,
  telefone text not null, -- whatsapp
  email text,
  endereco text,
  consentimento_lgpd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tutor_clinica on public.tutor (clinica_id);
create index idx_tutor_nome on public.tutor (clinica_id, nome);

create trigger trg_tutor_updated_at
  before update on public.tutor
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- pet
-- ------------------------------------------------------------
create table public.pet (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  tutor_id uuid not null references public.tutor (id) on delete cascade,
  nome text not null,
  especie text not null,
  raca text,
  sexo text check (sexo in ('macho', 'femea')),
  data_nascimento date,
  peso numeric(6, 2),
  castrado boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pet_clinica on public.pet (clinica_id);
create index idx_pet_tutor on public.pet (tutor_id);
create index idx_pet_nome on public.pet (clinica_id, nome);

create trigger trg_pet_updated_at
  before update on public.pet
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- agendamento
-- ------------------------------------------------------------
create table public.agendamento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  veterinario_id uuid references public.usuario (id) on delete set null,
  data_hora timestamptz not null,
  tipo text not null check (tipo in ('consulta', 'retorno', 'banho_tosa', 'cirurgia')),
  status text not null default 'agendado'
    check (status in ('agendado', 'check_in', 'atendido', 'check_out', 'cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agendamento_clinica on public.agendamento (clinica_id);
create index idx_agendamento_pet on public.agendamento (pet_id);
create index idx_agendamento_veterinario on public.agendamento (veterinario_id);
create index idx_agendamento_data on public.agendamento (clinica_id, data_hora);

create trigger trg_agendamento_updated_at
  before update on public.agendamento
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- consulta: o prontuário
-- ------------------------------------------------------------
create table public.consulta (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  veterinario_id uuid references public.usuario (id) on delete set null,
  agendamento_id uuid references public.agendamento (id) on delete set null,
  data timestamptz not null default now(),
  queixa text,
  anamnese text,
  exame_fisico text,
  diagnostico text,
  conduta text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_consulta_clinica on public.consulta (clinica_id);
create index idx_consulta_pet on public.consulta (pet_id);
create index idx_consulta_veterinario on public.consulta (veterinario_id);
create index idx_consulta_agendamento on public.consulta (agendamento_id);
create index idx_consulta_data on public.consulta (clinica_id, data);

create trigger trg_consulta_updated_at
  before update on public.consulta
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- anexo: arquivos da consulta (foto, pdf, exame)
-- ------------------------------------------------------------
create table public.anexo (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  consulta_id uuid not null references public.consulta (id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'pdf', 'exame')),
  url text not null, -- caminho no bucket 'anexos'
  nome_arquivo text,
  created_at timestamptz not null default now()
);

create index idx_anexo_clinica on public.anexo (clinica_id);
create index idx_anexo_consulta on public.anexo (consulta_id);

-- ------------------------------------------------------------
-- orcamento
-- ------------------------------------------------------------
create table public.orcamento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  consulta_id uuid references public.consulta (id) on delete set null,
  status text not null default 'aberto'
    check (status in ('aberto', 'aprovado', 'recusado')),
  valor_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orcamento_clinica on public.orcamento (clinica_id);
create index idx_orcamento_pet on public.orcamento (pet_id);
create index idx_orcamento_consulta on public.orcamento (consulta_id);
create index idx_orcamento_data on public.orcamento (clinica_id, created_at);

create trigger trg_orcamento_updated_at
  before update on public.orcamento
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- orcamento_item
-- ------------------------------------------------------------
create table public.orcamento_item (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  descricao text not null,
  quantidade numeric(10, 2) not null default 1 check (quantidade > 0),
  valor_unitario numeric(12, 2) not null default 0 check (valor_unitario >= 0),
  created_at timestamptz not null default now()
);

create index idx_orcamento_item_orcamento on public.orcamento_item (orcamento_id);

-- valor_total do orçamento é sempre recalculado a partir dos itens
create or replace function public.recalc_orcamento_total()
returns trigger
language plpgsql
as $$
declare
  v_orcamento_id uuid;
begin
  v_orcamento_id := coalesce(new.orcamento_id, old.orcamento_id);
  update public.orcamento
  set valor_total = coalesce((
    select sum(quantidade * valor_unitario)
    from public.orcamento_item
    where orcamento_id = v_orcamento_id
  ), 0)
  where id = v_orcamento_id;
  return null;
end;
$$;

create trigger trg_orcamento_item_recalc
  after insert or update or delete on public.orcamento_item
  for each row execute function public.recalc_orcamento_total();
