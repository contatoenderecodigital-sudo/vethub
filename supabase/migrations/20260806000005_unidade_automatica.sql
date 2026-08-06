-- ============================================================
-- Registro novo nasce com unidade, sem ninguém ter que lembrar
--
-- A coluna `unidade_id` foi criada aceitando nulo, senão a migração anterior
-- quebraria tudo que já existia. Mas deixar assim é pior do que não ter: aos
-- poucos o banco acumularia registros órfãos, sem unidade, e o saldo por
-- filial passaria a mentir sem ninguém perceber.
--
-- Em vez de espalhar `unidade_id: ...` por vinte server actions — onde basta
-- esquecer uma para o furo voltar — a regra fica no banco: se o insert não
-- disser a unidade, ela vem da pessoa que está gravando; se essa pessoa não
-- estiver presa a uma unidade, vem a matriz.
-- ============================================================

create or replace function public.preencher_unidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unidade_id is not null then
    return new;
  end if;

  -- A unidade de quem está gravando.
  select u.unidade_id into new.unidade_id
  from public.usuario u
  where u.id = auth.uid() and u.clinica_id = new.clinica_id;

  -- Quem enxerga a clínica inteira (dono, gerente) grava na matriz. O mesmo
  -- vale para rotinas de servidor, que não têm auth.uid().
  if new.unidade_id is null then
    select id into new.unidade_id
    from public.unidade
    where clinica_id = new.clinica_id and principal
    limit 1;
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'lote', 'movimentacao_estoque', 'caixa', 'venda', 'compra',
    'agendamento', 'internacao'
  ] loop
    execute format('drop trigger if exists trg_%1$s_unidade on public.%1$I', t);
    execute format(
      'create trigger trg_%1$s_unidade before insert on public.%1$I
       for each row execute function public.preencher_unidade()', t
    );
  end loop;
end $$;
