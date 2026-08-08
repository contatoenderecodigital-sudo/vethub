-- ============================================================
-- De quanto em quanto tempo a clínica paga
-- ============================================================
--
-- O mesmo plano custa três preços diferentes conforme o compromisso: 1 mês,
-- 6 meses ou 12 meses. Os valores moram em src/lib/plano-conta.ts (o único
-- lugar onde a política comercial é decidida); aqui fica só QUAL ciclo cada
-- clínica escolheu, que é o dado.
--
-- Não guardamos o preço na linha da clínica de propósito. Preço gravado vira
-- preço velho: uma tabela nova e as contas antigas continuariam cobrando o
-- valor de dois anos atrás sem ninguém perceber. Quando existir cobrança de
-- verdade, o valor vai para a FATURA — que é um registro histórico e deve
-- mesmo congelar — e não para o cadastro.

alter table public.clinica
  add column if not exists ciclo text not null default 'mensal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinica_ciclo_check'
  ) then
    alter table public.clinica add constraint clinica_ciclo_check
      check (ciclo in ('mensal', 'semestral', 'anual'));
  end if;
end $$;

-- Quando vence o período pago. Nulo enquanto a conta está em teste — quem
-- manda no teste é `trial_termina_em`, e duas datas dizendo a mesma coisa
-- acabariam discordando uma da outra.
alter table public.clinica
  add column if not exists renova_em date;

comment on column public.clinica.ciclo is
  'Compromisso de pagamento: mensal, semestral ou anual. O preço de cada um está em src/lib/plano-conta.ts.';
comment on column public.clinica.renova_em is
  'Fim do período pago. Nulo enquanto a conta está no teste gratuito.';

-- ------------------------------------------------------------
-- O ciclo também não muda pela aplicação
-- ------------------------------------------------------------
-- Pela mesma razão do plano: quem pudesse gravar ciclo = 'anual' pagaria o
-- preço do compromisso de 12 meses sem ter se comprometido com nada. A
-- função é substituída inteira porque a lista de colunas protegidas cresceu.
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
     or new.renova_em is distinct from old.renova_em then
    raise exception 'O plano da conta não pode ser alterado por aqui.';
  end if;

  return new;
end $$;
