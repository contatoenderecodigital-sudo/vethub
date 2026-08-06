-- ============================================================
-- Vacina ligada ao catálogo e próxima dose sugerida sozinha
--
-- O protocolo de saúde era 100% texto livre: "V10", "v10", "V-10" e
-- "Vacina V10" viravam quatro coisas diferentes, e o campo `proxima_dose`
-- ficava em branco porque ninguém calcula reforço de cabeça no balcão.
--
-- O efeito colateral era caro: o relatório "Vacinas a vencer" — que é uma
-- das melhores ferramentas de recompra da clínica — vivia zerado. Não por
-- falta de vacina aplicada, mas por falta da data do reforço.
--
-- Agora o protocolo aponta para o item do catálogo, e o item guarda de
-- quantos em quantos dias aquela vacina se repete. Com isso a data do
-- reforço é preenchida sozinha ao registrar a aplicação.
-- ============================================================

-- Intervalo até o reforço, em dias. Fica no ITEM porque é característica do
-- produto, não da aplicação: V10 anual = 365, giárdia = 21, e assim por
-- diante. Nulo = não se repete (ou ninguém configurou ainda).
alter table public.item
  add column if not exists intervalo_dose_dias integer
    check (intervalo_dose_dias is null or intervalo_dose_dias between 1 and 3650);

comment on column public.item.intervalo_dose_dias is
  'Dias até o reforço desta vacina/vermífugo. Preenche a próxima dose sozinho.';

-- De qual item do catálogo veio esta aplicação. Fica opcional de propósito:
-- o histórico antigo é texto livre e continua válido, e nem toda clínica vai
-- querer cadastrar cada vacina no catálogo no primeiro dia.
alter table public.protocolo_saude
  add column if not exists item_id uuid
    references public.item (id) on delete set null;

create index if not exists idx_protocolo_item
  on public.protocolo_saude (item_id)
  where item_id is not null;

-- Semente de intervalos para o que já estiver cadastrado como vacina, para a
-- clínica não começar do zero. São os intervalos usuais do mercado; a tela
-- de item permite ajustar.
update public.item set intervalo_dose_dias = 365
where vacina = true and intervalo_dose_dias is null;
