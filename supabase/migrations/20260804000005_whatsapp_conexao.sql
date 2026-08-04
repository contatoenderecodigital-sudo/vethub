-- ============================================================
-- VetHub — Fase 2: conexão WhatsApp Cloud API (Embedded Signup)
-- Guarda a conta WhatsApp Business (WABA) conectada por clínica.
--
-- SEGURANÇA: o token de acesso da Meta fica nesta tabela, então o
-- RLS é habilitado SEM nenhuma policy — nenhum usuário logado lê
-- nada por aqui. Todo acesso é feito no servidor com service_role,
-- sempre depois de validar que o chamador é admin da clínica.
-- ============================================================

create table public.whatsapp_conexao (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null unique references public.clinica (id) on delete cascade,
  waba_id text not null,            -- WhatsApp Business Account ID
  phone_number_id text not null,    -- ID do número na Cloud API
  numero_exibicao text,             -- número formatado para mostrar na UI
  nome_verificado text,             -- verified_name do número
  token_acesso text not null,       -- business token (uso exclusivo no servidor)
  status text not null default 'conectado'
    check (status in ('conectado', 'desconectado', 'erro')),
  conectado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_whatsapp_conexao_clinica on public.whatsapp_conexao (clinica_id);

create trigger trg_whatsapp_conexao_updated_at
  before update on public.whatsapp_conexao
  for each row execute function public.set_updated_at();

-- RLS ligado e SEM policies: acesso só via service_role no servidor.
alter table public.whatsapp_conexao enable row level security;

-- set_updated_at escreve em new.updated_at; esta tabela usa atualizado_em.
-- Corrige com um trigger específico:
drop trigger trg_whatsapp_conexao_updated_at on public.whatsapp_conexao;

create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_whatsapp_conexao_atualizado_em
  before update on public.whatsapp_conexao
  for each row execute function public.set_atualizado_em();
