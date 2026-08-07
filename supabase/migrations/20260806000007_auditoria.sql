-- ============================================================
-- Log de auditoria: quem fez o quê
--
-- "Quem cancelou essa venda?", "quem mudou o preço da consulta?", "quem
-- apagou o cadastro da dona Maria?" — são perguntas que aparecem na primeira
-- semana com dois funcionários, e que hoje não têm resposta. Depois do fato
-- não há como recuperar: a informação nunca foi gravada.
--
-- O registro é feito por GATILHO no banco, não pelas server actions. Dois
-- motivos: nenhuma tela pode esquecer de registrar, e quem mexer no banco
-- por fora do sistema (script, painel do Supabase) também fica registrado.
--
-- Só entram as tabelas onde a pergunta "quem foi?" tem consequência: dinheiro,
-- catálogo de preços, cadastro de cliente e equipe. Registrar tudo encheria a
-- tabela de ruído e deixaria a resposta mais difícil de achar, não mais fácil.
-- ============================================================

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  clinica_id uuid not null references public.clinica (id) on delete cascade,
  usuario_id uuid references public.usuario (id) on delete set null,
  -- Guardado à parte porque o usuário pode ser removido depois, e a pergunta
  -- "quem foi?" precisa continuar tendo resposta.
  usuario_nome text,
  tabela text not null,
  registro_id uuid,
  acao text not null check (acao in ('criou', 'alterou', 'excluiu')),
  -- Só o que MUDOU, não a linha inteira: o diff é o que se lê depois, e
  -- guardar tudo em toda alteração incharia a tabela sem necessidade.
  mudancas jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_auditoria_clinica
  on public.auditoria (clinica_id, criado_em desc);
create index if not exists idx_auditoria_registro
  on public.auditoria (tabela, registro_id);
create index if not exists idx_auditoria_usuario
  on public.auditoria (usuario_id, criado_em desc);

-- ------------------------------------------------------------
-- O gatilho
-- ------------------------------------------------------------
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linha jsonb;
  anterior jsonb;
  diff jsonb := '{}'::jsonb;
  chave text;
  acao text;
  quem uuid := auth.uid();
  nome text;
  clinica uuid;
begin
  if tg_op = 'INSERT' then
    acao := 'criou';
    linha := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    acao := 'alterou';
    linha := to_jsonb(new);
    anterior := to_jsonb(old);
  else
    acao := 'excluiu';
    linha := to_jsonb(old);
  end if;

  clinica := (linha ->> 'clinica_id')::uuid;
  if clinica is null then
    return coalesce(new, old);
  end if;

  -- No UPDATE guarda só os campos que mudaram de valor.
  if tg_op = 'UPDATE' then
    for chave in select jsonb_object_keys(linha) loop
      if chave in ('updated_at', 'created_at') then
        continue;
      end if;
      if (linha -> chave) is distinct from (anterior -> chave) then
        diff := diff || jsonb_build_object(
          chave,
          jsonb_build_object('de', anterior -> chave, 'para', linha -> chave)
        );
      end if;
    end loop;

    -- Nada de relevante mudou (só carimbo de tempo): não vira linha de log.
    if diff = '{}'::jsonb then
      return new;
    end if;
  else
    diff := linha;
  end if;

  select u.nome into nome from public.usuario u where u.id = quem;

  insert into public.auditoria (
    clinica_id, usuario_id, usuario_nome, tabela, registro_id, acao, mudancas
  ) values (
    clinica, quem, nome, tg_table_name, (linha ->> 'id')::uuid, acao, diff
  );

  return coalesce(new, old);
end $$;

-- ------------------------------------------------------------
-- Onde vale a pena registrar
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    -- dinheiro
    'venda', 'conta', 'baixa', 'caixa',
    -- preço e estoque
    'item', 'movimentacao_estoque',
    -- cliente e equipe
    'tutor', 'pet', 'usuario', 'unidade'
  ] loop
    execute format('drop trigger if exists trg_%1$s_auditoria on public.%1$I', t);
    execute format(
      'create trigger trg_%1$s_auditoria
       after insert or update or delete on public.%1$I
       for each row execute function public.registrar_auditoria()', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- Segurança: o log é SÓ LEITURA, e só para administrador
-- ------------------------------------------------------------
-- Sem política de insert, update ou delete de propósito. Log que o usuário
-- consegue apagar não serve para nada — quem fez a bobagem apagaria o rastro
-- dela. Só o gatilho escreve, porque roda como security definer.
alter table public.auditoria enable row level security;

drop policy if exists "auditoria: admin da clinica le" on public.auditoria;
create policy "auditoria: admin da clinica le" on public.auditoria for select to authenticated
  using (
    clinica_id = (select public.clinica_do_usuario())
    and (select public.papel_do_usuario()) = 'admin'
  );

grant select on public.auditoria to authenticated;
grant all privileges on public.auditoria to service_role;
