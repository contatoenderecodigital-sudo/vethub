-- ============================================================
-- Todo teste gratuito nasce com data para acabar
-- ============================================================
--
-- A migração anterior deu prazo às clínicas que JÁ existiam, mas esqueceu
-- das que viriam depois: o cadastro público insere a clínica só com o nome,
-- e `trial_termina_em` ficava nulo. Como o sistema trata nulo como "sem
-- prazo" (de propósito, para não travar quem é anterior à regra), toda conta
-- nova ganhava teste vitalício com tudo liberado.
--
-- O conserto fica no BANCO, e não no código do cadastro, porque a data
-- precisa valer para qualquer caminho que crie uma clínica — o cadastro de
-- hoje, uma importação amanhã, um insert manual do suporte. Um default é a
-- única forma de não depender de alguém lembrar.
alter table public.clinica
  alter column trial_termina_em
  set default ((now() at time zone 'America/Sao_Paulo')::date + 14);

-- As que já nasceram sem prazo entre uma migração e outra.
update public.clinica
   set trial_termina_em = (now() at time zone 'America/Sao_Paulo')::date + 14
 where plano = 'trial'
   and trial_termina_em is null;
