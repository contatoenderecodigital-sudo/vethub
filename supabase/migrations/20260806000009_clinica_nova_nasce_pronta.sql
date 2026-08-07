-- ============================================================
-- Clínica nova nasce pronta
--
-- As sementes até aqui eram aplicadas às clínicas QUE JÁ EXISTIAM no momento
-- da migração. Quem se cadastrasse depois recebia tudo vazio: sem unidades de
-- medida, sem grupos, sem marcas, sem categorias financeiras.
--
-- E, desde a migração de multi-unidade, sem MATRIZ — o que é pior do que
-- inconveniente: o gatilho que preenche `unidade_id` procura a matriz da
-- clínica e não acharia nenhuma, deixando venda, caixa e estoque órfãos de
-- unidade desde o primeiro dia.
--
-- A semente passa a ser um gatilho no cadastro da clínica. Assim vale para
-- quem se cadastrar amanhã sem ninguém precisar lembrar de rodar nada.
-- ============================================================

create or replace function public.semear_clinica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A matriz. Sem ela o sistema não tem onde pendurar caixa e estoque.
  insert into public.unidade (clinica_id, nome, principal, cnpj, telefone,
                              cep, logradouro, numero, complemento, bairro, cidade, uf)
  values (new.id, 'Matriz', true, new.cnpj, new.telefone,
          new.cep, new.logradouro, new.numero, new.complemento, new.bairro, new.cidade, new.uf);

  insert into public.unidade_medida (clinica_id, nome, sigla, fracionavel)
  select new.id, u.nome, u.sigla, u.fracionavel
  from (values
    ('Unidade', 'un', false),
    ('Caixa', 'cx', false),
    ('Frasco', 'fr', false),
    ('Ampola', 'amp', false),
    ('Comprimido', 'comp', false),
    ('Quilograma', 'kg', true),
    ('Grama', 'g', true),
    ('Mililitro', 'ml', true),
    ('Litro', 'L', true)
  ) as u(nome, sigla, fracionavel);

  insert into public.grupo_item (clinica_id, nome)
  select new.id, g.nome
  from (values
    ('Medicamentos'), ('Vacinas'), ('Antiparasitários'), ('Alimentação'),
    ('Higiene e beleza'), ('Acessórios'), ('Materiais e insumos'),
    ('Exames'), ('Serviços clínicos'), ('Banho e tosa')
  ) as g(nome);

  insert into public.marca (clinica_id, nome)
  select new.id, m.nome
  from (values
    ('Zoetis'), ('MSD Saúde Animal'), ('Boehringer Ingelheim'), ('Ceva'),
    ('Elanco'), ('Ourofino'), ('Vetnil'), ('Royal Canin'),
    ('Premier Pet'), ('Hills'), ('Farmina'), ('Genérico')
  ) as m(nome);

  insert into public.categoria_financeira (clinica_id, nome, tipo)
  select new.id, k.nome, k.tipo
  from (values
    ('Consultas', 'receita'), ('Vacinas', 'receita'), ('Cirurgias', 'receita'),
    ('Banho e tosa', 'receita'), ('Produtos', 'receita'), ('Planos', 'receita'),
    ('Fornecedores', 'despesa'), ('Salários', 'despesa'), ('Aluguel', 'despesa'),
    ('Energia e água', 'despesa'), ('Impostos', 'despesa'), ('Outros', 'despesa')
  ) as k(nome, tipo);

  return new;
end $$;

drop trigger if exists trg_clinica_semente on public.clinica;
create trigger trg_clinica_semente
  after insert on public.clinica
  for each row execute function public.semear_clinica();

-- Rede de segurança para quem já estava cadastrado sem matriz (não deveria
-- existir, mas custa uma linha e evita registro órfão).
insert into public.unidade (clinica_id, nome, principal)
select c.id, 'Matriz', true
from public.clinica c
where not exists (select 1 from public.unidade u where u.clinica_id = c.id);
