-- ============================================================
-- Semente de grupos e marcas
--
-- Unidades de medida já vinham prontas, mas Grupos e Marcas nasciam vazios.
-- Quem abre o VetHub no primeiro dia e vai cadastrar um produto encontra dois
-- selects sem nenhuma opção, e é obrigado a parar, sair da tela, criar o
-- grupo, criar a marca e voltar. É a primeira impressão do sistema.
--
-- Os grupos são a divisão usual de clínica e petshop. As marcas são as mais
-- comuns no mercado brasileiro. Nada disso é obrigatório: tudo pode ser
-- renomeado ou apagado.
-- ============================================================

insert into public.grupo_item (clinica_id, nome)
select c.id, g.nome
from public.clinica c
cross join (values
  ('Medicamentos'),
  ('Vacinas'),
  ('Antiparasitários'),
  ('Alimentação'),
  ('Higiene e beleza'),
  ('Acessórios'),
  ('Materiais e insumos'),
  ('Exames'),
  ('Serviços clínicos'),
  ('Banho e tosa')
) as g(nome)
where not exists (
  select 1 from public.grupo_item x
  where x.clinica_id = c.id and lower(x.nome) = lower(g.nome)
);

insert into public.marca (clinica_id, nome)
select c.id, m.nome
from public.clinica c
cross join (values
  ('Zoetis'),
  ('MSD Saúde Animal'),
  ('Boehringer Ingelheim'),
  ('Ceva'),
  ('Elanco'),
  ('Ourofino'),
  ('Vetnil'),
  ('Royal Canin'),
  ('Premier Pet'),
  ('Hills'),
  ('Farmina'),
  ('Genérico')
) as m(nome)
where not exists (
  select 1 from public.marca x
  where x.clinica_id = c.id and lower(x.nome) = lower(m.nome)
);
