-- ============================================================
-- O caderno de medicamentos da clínica
-- ============================================================
--
-- Hoje o veterinário digita tudo de novo em cada receita: nome, mg, forma,
-- via e posologia. Ele prescreve os mesmos vinte medicamentos a vida
-- inteira, e redigitar "Amoxicilina + Clavulanato 250 mg" pela milésima vez
-- é onde o sistema rouba o tempo dele — e onde nasce o erro de digitação
-- que vai impresso numa receita.
--
-- Aqui a clínica cadastra uma vez e escolhe depois.
--
-- POR QUE NÃO USAR A TABELA `item`
--
-- Parece a escolha óbvia — já existe `item` com `medicamento`, mg no nome e
-- `principio_ativo`. Mas item é o que a clínica VENDE: tem preço, estoque,
-- custo e comissão. Boa parte do que se prescreve a clínica não vende —
-- remédio de farmácia humana, fórmula manipulada, marca que ela não estoca.
-- Obrigar cada um a virar produto encheria o catálogo de linhas com preço
-- zero e estoque zero, e bagunçaria o inventário para resolver um problema
-- de receituário.
--
-- Quem é as duas coisas fica ligado pelo `item_id`, que é opcional.

create table if not exists public.medicamento_receita (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinica (id) on delete cascade,

  nome text not null,
  concentracao text,
  forma_farmaceutica text,
  via text,

  -- Os campos que a receita repete sempre iguais. É a maior economia de
  -- tempo do cadastro: escolher o medicamento já traz a posologia escrita.
  quantidade_padrao text,
  posologia_padrao text,
  observacao text,

  -- Ligação opcional com o catálogo, para o que a clínica também vende.
  item_id uuid references public.item (id) on delete set null,

  -- Contador de uso: é o que põe os mais receitados no topo da busca. Sem
  -- ele a lista é alfabética, e o veterinário rola até achar o de sempre.
  vezes_usado integer not null default 0,

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mesmo nome com mg diferente são medicamentos diferentes na prática
  -- (250 mg e 500 mg não se confundem), então a unicidade leva os dois.
  unique (clinica_id, nome, concentracao)
);

create index if not exists idx_medicamento_receita_clinica
  on public.medicamento_receita (clinica_id, ativo);

-- Busca por nome no combobox: `ilike '%termo%'` não usa índice comum, então
-- entra o de trigrama, que é o que a busca de itens já usa neste banco.
create extension if not exists pg_trgm;
create index if not exists idx_medicamento_receita_nome
  on public.medicamento_receita using gin (nome gin_trgm_ops);

comment on table public.medicamento_receita is
  'Medicamentos que a clínica costuma prescrever, para não redigitar em cada receita. Não confundir com `item`, que é o que ela vende.';
comment on column public.medicamento_receita.vezes_usado is
  'Quantas receitas já usaram este medicamento. Ordena a busca pelos mais receitados.';

-- ------------------------------------------------------------
-- Quem enxerga o quê
-- ------------------------------------------------------------
alter table public.medicamento_receita enable row level security;

create policy "medicamento_receita: select da clinica"
  on public.medicamento_receita for select to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

create policy "medicamento_receita: insert na clinica"
  on public.medicamento_receita for insert to authenticated
  with check (clinica_id = (select public.clinica_do_usuario()));

create policy "medicamento_receita: update da clinica"
  on public.medicamento_receita for update to authenticated
  using (clinica_id = (select public.clinica_do_usuario()))
  with check (clinica_id = (select public.clinica_do_usuario()));

create policy "medicamento_receita: delete da clinica"
  on public.medicamento_receita for delete to authenticated
  using (clinica_id = (select public.clinica_do_usuario()));

grant select, insert, update, delete on public.medicamento_receita to authenticated;
grant all privileges on public.medicamento_receita to service_role;

-- `updated_at` sozinho, como nas outras tabelas.
drop trigger if exists trg_medicamento_receita_updated on public.medicamento_receita;
create trigger trg_medicamento_receita_updated
  before update on public.medicamento_receita
  for each row execute function public.set_updated_at();
