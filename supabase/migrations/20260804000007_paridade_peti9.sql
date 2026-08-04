-- ============================================================
-- VetHub — paridade com a concorrência (Peti9 e cia)
-- Foto do pet, peso com histórico, etiquetas, saldo do cliente,
-- vacinas/vermífugos, internação e retorno.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Pet: foto, microchip, pelagem, porte, falecido
-- ------------------------------------------------------------
alter table public.pet
  add column if not exists foto_url text,
  add column if not exists microchip text,
  add column if not exists pelagem text,
  add column if not exists porte text check (porte in ('mini', 'pequeno', 'medio', 'grande', 'gigante')),
  add column if not exists falecido boolean not null default false,
  add column if not exists alergias text,
  add column if not exists etiquetas text[] not null default '{}';

-- Tutor: foto também (a Peti9 mostra avatar do cliente)
alter table public.tutor
  add column if not exists foto_url text;

-- ------------------------------------------------------------
-- 2. Histórico de peso (a Peti9 mostra "40 kg (18/09/2025)")
-- ------------------------------------------------------------
create table if not exists public.pesagem (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  peso numeric(6, 2) not null check (peso > 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  observacao text,
  registrado_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pesagem_clinica on public.pesagem (clinica_id);
create index if not exists idx_pesagem_pet on public.pesagem (pet_id, data desc);

-- Toda pesagem atualiza o peso atual do pet
create or replace function public.sincronizar_peso_do_pet()
returns trigger
language plpgsql
as $$
begin
  update public.pet
  set peso = (
    select p.peso from public.pesagem p
    where p.pet_id = coalesce(new.pet_id, old.pet_id)
    order by p.data desc, p.created_at desc
    limit 1
  )
  where id = coalesce(new.pet_id, old.pet_id);
  return null;
end;
$$;

drop trigger if exists trg_pesagem_sincroniza on public.pesagem;
create trigger trg_pesagem_sincroniza
  after insert or update or delete on public.pesagem
  for each row execute function public.sincronizar_peso_do_pet();

-- ------------------------------------------------------------
-- 3. Protocolos de saúde: vacinas, vermífugos, antiparasitários
--    (a Peti9 tem uma aba para cada — aqui é uma tabela só,
--     diferenciada por tipo, com controle de reforço)
-- ------------------------------------------------------------
create table if not exists public.protocolo_saude (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  tipo text not null check (tipo in ('vacina', 'vermifugo', 'antiparasitario')),
  nome text not null,                 -- ex.: V10, Bravecto
  lote text,
  fabricante text,
  data_aplicacao date not null,
  proxima_dose date,                  -- alimenta os lembretes de WhatsApp
  dose text,                          -- ex.: "1ª dose", "reforço anual"
  veterinario_id uuid references public.usuario (id) on delete set null,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_protocolo_clinica on public.protocolo_saude (clinica_id);
create index if not exists idx_protocolo_pet on public.protocolo_saude (pet_id, data_aplicacao desc);
-- índice para a busca de "quem precisa de reforço nos próximos dias"
create index if not exists idx_protocolo_proxima on public.protocolo_saude (clinica_id, proxima_dose)
  where proxima_dose is not null;

-- ------------------------------------------------------------
-- 4. Financeiro do tutor: lançamentos de débito/crédito
--    (o painel "Saldo do cliente" da Peti9)
-- ------------------------------------------------------------
create table if not exists public.lancamento_financeiro (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  tutor_id uuid not null references public.tutor (id) on delete cascade,
  tipo text not null check (tipo in ('debito', 'credito')),
  valor numeric(12, 2) not null check (valor > 0),
  descricao text not null,
  orcamento_id uuid references public.orcamento (id) on delete set null,
  consulta_id uuid references public.consulta (id) on delete set null,
  forma_pagamento text,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  registrado_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lancamento_clinica on public.lancamento_financeiro (clinica_id);
create index if not exists idx_lancamento_tutor on public.lancamento_financeiro (tutor_id, data desc);

-- Saldo do tutor: crédito - débito (negativo = deve para a clínica)
create or replace function public.saldo_do_tutor(p_tutor_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    case when tipo = 'credito' then valor else -valor end
  ), 0)
  from public.lancamento_financeiro
  where tutor_id = p_tutor_id
$$;

-- ------------------------------------------------------------
-- 5. Agendamento: retorno, observações do dia, ordem no kanban
-- ------------------------------------------------------------
alter table public.agendamento
  add column if not exists agendamento_origem_id uuid references public.agendamento (id) on delete set null,
  add column if not exists etiquetas text[] not null default '{}',
  add column if not exists check_in_em timestamptz,
  add column if not exists check_out_em timestamptz;

-- status 'pronto' (a Peti9 tem: agendado, check-in, pronto, check-out, cancelado)
alter table public.agendamento drop constraint if exists agendamento_status_check;
alter table public.agendamento add constraint agendamento_status_check
  check (status in ('agendado', 'check_in', 'atendido', 'pronto', 'check_out', 'cancelado'));

-- ------------------------------------------------------------
-- 6. Internação (Fase 3 — os concorrentes cobram à parte por isso)
-- ------------------------------------------------------------
create table if not exists public.internacao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  pet_id uuid not null references public.pet (id) on delete cascade,
  veterinario_id uuid references public.usuario (id) on delete set null,
  box text,
  data_entrada timestamptz not null default now(),
  data_saida timestamptz,
  motivo text not null,
  diagnostico text,
  status text not null default 'internado' check (status in ('internado', 'alta', 'obito')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internacao_clinica on public.internacao (clinica_id);
create index if not exists idx_internacao_pet on public.internacao (pet_id);
create index if not exists idx_internacao_status on public.internacao (clinica_id, status);

drop trigger if exists trg_internacao_updated_at on public.internacao;
create trigger trg_internacao_updated_at
  before update on public.internacao
  for each row execute function public.set_updated_at();

create table if not exists public.prescricao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  internacao_id uuid not null references public.internacao (id) on delete cascade,
  medicamento text not null,
  dose text not null,
  via text,                            -- oral, IV, IM, SC
  frequencia_horas integer check (frequencia_horas > 0),
  horarios time[] not null default '{}',
  inicio timestamptz not null default now(),
  fim timestamptz,
  observacao text,
  prescrito_por uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_prescricao_clinica on public.prescricao (clinica_id);
create index if not exists idx_prescricao_internacao on public.prescricao (internacao_id);

create table if not exists public.administracao_medicamento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  prescricao_id uuid not null references public.prescricao (id) on delete cascade,
  horario_previsto timestamptz not null,
  horario_realizado timestamptz,
  responsavel_id uuid references public.usuario (id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'aplicado', 'atrasado', 'suspenso')),
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_administracao_clinica on public.administracao_medicamento (clinica_id);
create index if not exists idx_administracao_prescricao on public.administracao_medicamento (prescricao_id);
create index if not exists idx_administracao_horario on public.administracao_medicamento (clinica_id, horario_previsto)
  where status = 'pendente';

create table if not exists public.evolucao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  internacao_id uuid not null references public.internacao (id) on delete cascade,
  data_hora timestamptz not null default now(),
  texto text not null,
  temperatura numeric(4, 1),
  frequencia_cardiaca integer,
  frequencia_respiratoria integer,
  responsavel_id uuid references public.usuario (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_evolucao_clinica on public.evolucao (clinica_id);
create index if not exists idx_evolucao_internacao on public.evolucao (internacao_id, data_hora desc);

-- ------------------------------------------------------------
-- 7. RLS de todas as tabelas novas (mesmo padrão: isolamento
--    por clinica_id via helper em subselect)
-- ------------------------------------------------------------
alter table public.pesagem enable row level security;
alter table public.protocolo_saude enable row level security;
alter table public.lancamento_financeiro enable row level security;
alter table public.internacao enable row level security;
alter table public.prescricao enable row level security;
alter table public.administracao_medicamento enable row level security;
alter table public.evolucao enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'pesagem', 'protocolo_saude', 'lancamento_financeiro',
    'internacao', 'prescricao', 'evolucao'
  ] loop
    execute format($f$
      create policy "%1$s: select da clinica" on public.%1$I for select to authenticated
        using (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: insert na clinica" on public.%1$I for insert to authenticated
        with check (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: update da clinica" on public.%1$I for update to authenticated
        using (clinica_id = (select public.clinica_do_usuario()))
        with check (clinica_id = (select public.clinica_do_usuario()));
      create policy "%1$s: delete da clinica" on public.%1$I for delete to authenticated
        using (clinica_id = (select public.clinica_do_usuario()));
    $f$, t);
  end loop;
end $$;

-- administracao_medicamento segue o mesmo padrão (tem clinica_id próprio)
create policy "administracao: select da clinica" on public.administracao_medicamento
  for select to authenticated using (clinica_id = (select public.clinica_do_usuario()));
create policy "administracao: insert na clinica" on public.administracao_medicamento
  for insert to authenticated with check (clinica_id = (select public.clinica_do_usuario()));
create policy "administracao: update da clinica" on public.administracao_medicamento
  for update to authenticated using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "administracao: delete da clinica" on public.administracao_medicamento
  for delete to authenticated using (clinica_id = (select public.clinica_do_usuario()));

-- Grants (projetos novos do Supabase não concedem automático)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- ------------------------------------------------------------
-- 8. Bucket público de fotos de pets e tutores
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos: leitura publica"
  on storage.objects for select to public
  using (bucket_id = 'fotos');

create policy "fotos: upload na propria clinica"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select public.clinica_do_usuario())::text
  );

create policy "fotos: remocao da propria clinica"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select public.clinica_do_usuario())::text
  );
