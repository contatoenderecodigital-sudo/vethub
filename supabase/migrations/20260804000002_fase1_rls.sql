-- ============================================================
-- VetHub — Fase 1: Row Level Security
-- O isolamento acontece no banco, via RLS, nunca por filtro no front.
-- Policies enxutas: helpers em subselect para avaliar 1x por query.
-- ============================================================

-- ------------------------------------------------------------
-- Helpers (security definer para evitar recursão nas policies
-- de usuario e ser avaliado sem RLS)
-- ------------------------------------------------------------
create or replace function public.clinica_do_usuario()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinica_id from public.usuario where id = auth.uid()
$$;

create or replace function public.papel_do_usuario()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.usuario where id = auth.uid()
$$;

revoke execute on function public.clinica_do_usuario() from anon;
revoke execute on function public.papel_do_usuario() from anon;

-- ------------------------------------------------------------
-- Habilitar RLS em todas as tabelas
-- ------------------------------------------------------------
alter table public.clinica enable row level security;
alter table public.usuario enable row level security;
alter table public.tutor enable row level security;
alter table public.pet enable row level security;
alter table public.agendamento enable row level security;
alter table public.consulta enable row level security;
alter table public.anexo enable row level security;
alter table public.orcamento enable row level security;
alter table public.orcamento_item enable row level security;

-- ------------------------------------------------------------
-- clinica: membro vê a própria; só admin edita.
-- Criação de clínica é feita pelo servidor (service_role).
-- ------------------------------------------------------------
create policy "clinica: membro ve a propria"
  on public.clinica for select to authenticated
  using (id = (select public.clinica_do_usuario()));

create policy "clinica: admin edita a propria"
  on public.clinica for update to authenticated
  using (
    id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) = 'admin'
  )
  with check (id = (select public.clinica_do_usuario()));

-- ------------------------------------------------------------
-- usuario: membros se veem; só admin gerencia.
-- Insert é feito pelo servidor (service_role) junto com auth.users.
-- Self-update é bloqueado para impedir escalada de papel.
-- ------------------------------------------------------------
create policy "usuario: membros da clinica se veem"
  on public.usuario for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

create policy "usuario: admin edita membros"
  on public.usuario for update to authenticated
  using (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) = 'admin'
  )
  with check (clinica_id = (select public.clinica_do_usuario()));

create policy "usuario: admin remove membros"
  on public.usuario for delete to authenticated
  using (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) = 'admin'
    and id <> (select auth.uid())
  );

-- ------------------------------------------------------------
-- Tabelas de negócio: CRUD completo para membros da clínica.
-- ------------------------------------------------------------

-- tutor
create policy "tutor: select da clinica"
  on public.tutor for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "tutor: insert na clinica"
  on public.tutor for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "tutor: update da clinica"
  on public.tutor for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "tutor: delete da clinica"
  on public.tutor for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

-- pet
create policy "pet: select da clinica"
  on public.pet for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "pet: insert na clinica"
  on public.pet for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "pet: update da clinica"
  on public.pet for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "pet: delete da clinica"
  on public.pet for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

-- agendamento
create policy "agendamento: select da clinica"
  on public.agendamento for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "agendamento: insert na clinica"
  on public.agendamento for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "agendamento: update da clinica"
  on public.agendamento for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "agendamento: delete da clinica"
  on public.agendamento for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

-- consulta: prontuário é escrito por veterinário ou admin
create policy "consulta: select da clinica"
  on public.consulta for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "consulta: vet/admin insere"
  on public.consulta for insert to authenticated
  with check (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) in ('veterinario', 'admin')
  );
create policy "consulta: vet/admin edita"
  on public.consulta for update to authenticated
  using (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) in ('veterinario', 'admin')
  )
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "consulta: vet/admin remove"
  on public.consulta for delete to authenticated
  using (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) in ('veterinario', 'admin')
  );

-- anexo
create policy "anexo: select da clinica"
  on public.anexo for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "anexo: insert na clinica"
  on public.anexo for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "anexo: delete da clinica"
  on public.anexo for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

-- orcamento
create policy "orcamento: select da clinica"
  on public.orcamento for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));
create policy "orcamento: insert na clinica"
  on public.orcamento for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "orcamento: update da clinica"
  on public.orcamento for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));
create policy "orcamento: delete da clinica"
  on public.orcamento for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

-- orcamento_item: isolado via orçamento pai
create policy "orcamento_item: select via orcamento"
  on public.orcamento_item for select to authenticated
  using (exists (
    select 1 from public.orcamento o
    where o.id = orcamento_id
      and o.clinica_id = (select public.clinica_do_usuario())
  ));
create policy "orcamento_item: insert via orcamento"
  on public.orcamento_item for insert to authenticated
  with check (exists (
    select 1 from public.orcamento o
    where o.id = orcamento_id
      and o.clinica_id = (select public.clinica_do_usuario())
  ));
create policy "orcamento_item: update via orcamento"
  on public.orcamento_item for update to authenticated
  using (exists (
    select 1 from public.orcamento o
    where o.id = orcamento_id
      and o.clinica_id = (select public.clinica_do_usuario())
  ))
  with check (exists (
    select 1 from public.orcamento o
    where o.id = orcamento_id
      and o.clinica_id = (select public.clinica_do_usuario())
  ));
create policy "orcamento_item: delete via orcamento"
  on public.orcamento_item for delete to authenticated
  using (exists (
    select 1 from public.orcamento o
    where o.id = orcamento_id
      and o.clinica_id = (select public.clinica_do_usuario())
  ));
