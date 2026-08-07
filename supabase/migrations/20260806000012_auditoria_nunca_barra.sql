-- ============================================================
-- Auditoria nunca pode barrar uma operação legítima
--
-- Ao apagar uma clínica, o cascade apaga tutores, vendas, itens — e o
-- gatilho de auditoria tenta registrar cada exclusão. Só que a linha de log
-- aponta para a clínica, que está sendo apagada na mesma operação: o banco
-- recusa a chave estrangeira e a exclusão inteira falha.
--
-- Foi assim que apareceu: as clínicas do teste de isolamento pararam de ser
-- apagadas no fim do teste e começaram a se acumular.
--
-- O conserto tem duas partes, e a segunda é a que importa como princípio:
--
-- 1. o log morre junto com a clínica (cascade), como qualquer outro dado;
-- 2. o registro vira BEST-EFFORT. Se por qualquer motivo não der para
--    gravar o log, a operação do usuário segue assim mesmo. Um sistema em
--    que a auditoria consegue impedir uma venda de acontecer é pior do que
--    um sem auditoria nenhuma.
-- ============================================================

alter table public.auditoria
  drop constraint if exists auditoria_clinica_id_fkey;

alter table public.auditoria
  add constraint auditoria_clinica_id_fkey
  foreign key (clinica_id) references public.clinica (id) on delete cascade;

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

    if diff = '{}'::jsonb then
      return new;
    end if;
  else
    diff := linha;
  end if;

  select u.nome into nome from public.usuario u where u.id = quem;

  begin
    insert into public.auditoria (
      clinica_id, usuario_id, usuario_nome, tabela, registro_id, acao, mudancas
    ) values (
      clinica, quem, nome, tg_table_name, (linha ->> 'id')::uuid, acao, diff
    );
  exception
    when others then
      -- Registrar é importante; impedir o trabalho da clínica, não. Se o log
      -- falhar (clínica sendo apagada, disco cheio, o que for), a operação
      -- do usuário continua.
      null;
  end;

  return coalesce(new, old);
end $$;
