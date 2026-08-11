-- ============================================================
-- Suporte por chamado e o registro do que já foi pago
-- ============================================================
--
-- Hoje o único canal de suporte é o WhatsApp do dono. Funciona com três
-- clínicas e desmonta com trinta: a conversa se perde no meio de mensagem
-- pessoal, ninguém sabe o que ficou sem resposta, e o histórico de um
-- problema some quando o celular troca.
--
-- E a cobrança é combinada por fora. Sem registrar o que entrou, em dois
-- meses ninguém lembra quem pagou qual mês — que é exatamente como se perde
-- dinheiro sem perceber.

-- ------------------------------------------------------------
-- 1. Chamados
-- ------------------------------------------------------------
create table if not exists public.ticket (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  aberto_por uuid references public.usuario (id) on delete set null,

  assunto text not null,
  categoria text not null default 'duvida'
    check (categoria in ('duvida', 'problema', 'sugestao', 'cobranca')),

  status text not null default 'aberto'
    check (status in ('aberto', 'respondido', 'aguardando_cliente', 'resolvido')),

  -- Quem grita mais alto não fura fila: a urgência é definida pelo suporte,
  -- olhando o caso, e não pelo cliente escolhendo num campo.
  prioridade text not null default 'normal'
    check (prioridade in ('baixa', 'normal', 'alta')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolvido_em timestamptz
);

create index if not exists idx_ticket_clinica on public.ticket (clinica_id, created_at desc);
create index if not exists idx_ticket_status on public.ticket (status, created_at desc);

create table if not exists public.ticket_mensagem (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.ticket (id) on delete cascade,

  -- Nulo quando a mensagem é do suporte: quem responde pelo VetHub não é
  -- usuário de nenhuma clínica, então não tem linha em `usuario`.
  autor_id uuid references public.usuario (id) on delete set null,
  do_suporte boolean not null default false,

  texto text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_mensagem on public.ticket_mensagem (ticket_id, created_at);

-- ------------------------------------------------------------
-- 2. O que já foi pago
-- ------------------------------------------------------------
-- Enquanto a cobrança é por Pix combinado, este é o único lugar que sabe
-- quem está em dia. Quando entrar gateway, ele continua valendo: a baixa
-- automática grava aqui do mesmo jeito, e o histórico não se parte em dois.
create table if not exists public.pagamento_assinatura (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,

  valor numeric(12, 2) not null check (valor > 0),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  forma text not null default 'pix',

  -- O período que este pagamento cobre. É o que responde "até quando essa
  -- clínica está paga?" sem ninguém precisar contar no dedo.
  competencia_de date,
  competencia_ate date,

  observacao text,
  -- E-mail de quem registrou. Texto e não chave estrangeira: quem dá baixa é
  -- o dono do VetHub, que não é usuário de clínica nenhuma.
  registrado_por text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pagamento_clinica
  on public.pagamento_assinatura (clinica_id, data desc);

-- ------------------------------------------------------------
-- Quem enxerga o quê
-- ------------------------------------------------------------
alter table public.ticket enable row level security;
alter table public.ticket_mensagem enable row level security;
alter table public.pagamento_assinatura enable row level security;

-- A clínica vê e abre os PRÓPRIOS chamados. Não pode apagar: chamado
-- apagado é conversa que some do meio, e o suporte fica sem contexto do que
-- já foi tentado.
create policy "ticket: select da clinica" on public.ticket for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "ticket: insert na clinica" on public.ticket for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));

-- Mensagens seguem o chamado. A clínica só escreve como cliente: o
-- `do_suporte` fica falso, senão daria para forjar uma resposta do VetHub
-- dentro do próprio chamado.
create policy "ticket_mensagem: select via ticket" on public.ticket_mensagem
  for select to authenticated
  using (exists (select 1 from public.ticket t where t.id = ticket_id
    and t.clinica_id = (select public.clinica_do_usuario())));
create policy "ticket_mensagem: insert via ticket" on public.ticket_mensagem
  for insert to authenticated
  with check (
    do_suporte = false
    and exists (select 1 from public.ticket t where t.id = ticket_id
      and t.clinica_id = (select public.clinica_do_usuario()))
  );

-- Pagamento a clínica só LÊ. Deixar escrever seria deixar o cliente
-- declarar que pagou.
create policy "pagamento_assinatura: select da clinica" on public.pagamento_assinatura
  for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

grant select, insert on public.ticket to authenticated;
grant select, insert on public.ticket_mensagem to authenticated;
grant select on public.pagamento_assinatura to authenticated;
grant all privileges on public.ticket, public.ticket_mensagem,
  public.pagamento_assinatura to service_role;

drop trigger if exists trg_ticket_updated on public.ticket;
create trigger trg_ticket_updated
  before update on public.ticket
  for each row execute function public.set_updated_at();
