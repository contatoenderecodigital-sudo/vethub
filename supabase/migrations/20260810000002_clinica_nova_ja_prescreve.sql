-- ============================================================
-- Clínica nova já sabe prescrever
-- ============================================================
--
-- O caderno de medicamentos existe para o veterinário não redigitar
-- "Amoxicilina + Clavulanato 250 mg, VO, 1 comprimido a cada 12 h por 7
-- dias" pela milésima vez. Só que ele nascia VAZIO em toda clínica.
--
-- Isso mata o recurso na primeira hora, que é a única que importa: o
-- veterinário abre a receita, o campo de medicamento não sugere nada, ele
-- digita tudo na mão — e conclui que o VetHub é igual aos outros. Ninguém
-- para de atender para cadastrar quarenta medicamentos antes de usar o
-- sistema; o sistema é que tem que chegar sabendo.
--
-- Então a semente entra junto das unidades, grupos e marcas, no mesmo
-- gatilho de cadastro da clínica.
--
-- O QUE ENTRA E O QUE NÃO ENTRA
--
-- Entram os medicamentos de uso corriqueiro em clínica de pequenos animais,
-- com a posologia na forma em que ela é ESCRITA na receita, não calculada:
-- o "mg/kg" fica no texto para o veterinário ajustar ao peso do paciente.
-- Sugerir uma dose fechada seria o sistema prescrevendo no lugar dele, e
-- isso não é papel de software.
--
-- Não entram controlados de tarja preta, anestésicos e quimioterápicos: são
-- prescrição com receituário próprio, dose calculada caso a caso, e uma
-- sugestão errada ali é grave. A clínica cadastra os dela.
--
-- Tudo aqui pode ser renomeado ou apagado. É ponto de partida, não regra.

create or replace function public.semear_medicamentos(p_clinica uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.medicamento_receita
    (clinica_id, nome, concentracao, forma_farmaceutica, via,
     quantidade_padrao, posologia_padrao)
  select p_clinica, m.nome, m.concentracao, m.forma, m.via, m.quantidade, m.posologia
  from (values
    -- Antibióticos
    ('Amoxicilina + Clavulanato', '250 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 12 horas, por 7 dias.'),
    ('Amoxicilina + Clavulanato', '50 mg/ml', 'Suspensão oral', 'Oral', '1 frasco',
     'Dar conforme o peso, a cada 12 horas, por 7 dias.'),
    ('Enrofloxacino', '50 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, por 7 dias.'),
    ('Cefalexina', '300 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 12 horas, por 10 dias.'),
    ('Metronidazol', '250 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 12 horas, por 5 dias.'),
    ('Doxiciclina', '100 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, por 21 dias.'),

    -- Anti-inflamatórios e dor
    ('Meloxicam', '2 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, por 3 dias.'),
    ('Meloxicam', '0,2 mg/ml', 'Suspensão oral', 'Oral', '1 frasco',
     'Dar conforme o peso, a cada 24 horas, por 3 dias.'),
    ('Carprofeno', '25 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 12 horas, por 5 dias.'),
    ('Firocoxibe', '57 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, por 5 dias.'),
    ('Dipirona', '500 mg/ml', 'Solução oral', 'Oral', '1 frasco',
     'Dar conforme o peso, a cada 8 horas, enquanto houver dor ou febre.'),
    ('Prednisolona', '20 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar conforme orientação, reduzindo a dose aos poucos. Não interromper de uma vez.'),
    ('Tramadol', '50 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar conforme o peso, a cada 8 horas, enquanto houver dor.'),

    -- Antiparasitários
    ('Ivermectina', '6 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar conforme o peso, dose única. Não usar em raças sensíveis (Collie e afins).'),
    ('Praziquantel + Pirantel + Febantel', 'Cão', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido por 10 kg, dose única. Repetir em 15 dias.'),
    ('Fluralaner', 'Conforme o peso', 'Comprimido', 'Oral', '1 comprimido',
     'Dar 1 comprimido junto da comida. Repetir a cada 12 semanas.'),
    ('Sarolaner', 'Conforme o peso', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido junto da comida, a cada 30 dias.'),
    ('Fipronil', 'Conforme o peso', 'Solução tópica', 'Tópica', '1 pipeta',
     'Aplicar na pele, entre as escápulas. Repetir a cada 30 dias.'),

    -- Digestivo
    ('Omeprazol', '10 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, em jejum, por 14 dias.'),
    ('Ondansetrona', '4 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar conforme o peso, a cada 12 horas, enquanto houver vômito.'),
    ('Maropitant', '16 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, por até 5 dias.'),
    ('Probiótico veterinário', 'Sachê', 'Pó', 'Oral', '1 caixa',
     'Dar 1 sachê a cada 24 horas, misturado na comida, por 7 dias.'),

    -- Pele e ouvido
    ('Clorexidina', '2%', 'Xampu', 'Tópica', '1 frasco',
     'Banhar 2 vezes por semana. Deixar agir 10 minutos antes de enxaguar.'),
    ('Ceruminolítico auricular', 'Solução', 'Solução ótica', 'Ótica', '1 frasco',
     'Limpar os ouvidos 2 vezes por semana.'),
    ('Cetoconazol', '200 mg', 'Comprimido', 'Oral', '1 caixa',
     'Dar conforme o peso, a cada 24 horas, por 21 dias.'),

    -- Olho
    ('Lágrima artificial', 'Solução', 'Colírio', 'Oftálmica', '1 frasco',
     'Pingar 1 gota em cada olho, a cada 8 horas.'),
    ('Tobramicina', '0,3%', 'Colírio', 'Oftálmica', '1 frasco',
     'Pingar 1 gota no olho afetado, a cada 8 horas, por 7 dias.'),

    -- Suporte
    ('Suplemento articular', 'Comprimido', 'Comprimido', 'Oral', '1 caixa',
     'Dar 1 comprimido a cada 24 horas, de uso contínuo.'),
    ('Ômega 3 veterinário', 'Cápsula', 'Cápsula', 'Oral', '1 caixa',
     'Dar 1 cápsula a cada 24 horas, junto da comida.')
  ) as m(nome, concentracao, forma, via, quantidade, posologia)
  -- `on conflict` não serve aqui: a chave única leva `concentracao`, que
  -- aceita nulo, e nulo nunca conflita com nulo no Postgres. O `not exists`
  -- é o que realmente impede duplicar ao rodar de novo.
  where not exists (
    select 1 from public.medicamento_receita x
    where x.clinica_id = p_clinica
      and x.nome = m.nome
      and x.concentracao is not distinct from m.concentracao
  );
$$;

comment on function public.semear_medicamentos(uuid) is
  'Enche o caderno de medicamentos de uma clínica com os de uso corriqueiro. Idempotente.';

-- ------------------------------------------------------------
-- Entra no gatilho, junto do resto
-- ------------------------------------------------------------
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

  -- O caderno de medicamentos, para a primeira receita já sair pronta.
  perform public.semear_medicamentos(new.id);

  return new;
end $$;

-- As clínicas que já existem também recebem, senão o recurso só funciona
-- para quem se cadastrar de hoje em diante — e quem está testando agora é
-- justamente quem precisa ver o sistema chegando pronto.
do $$
declare c record;
begin
  for c in select id from public.clinica loop
    perform public.semear_medicamentos(c.id);
  end loop;
end $$;
