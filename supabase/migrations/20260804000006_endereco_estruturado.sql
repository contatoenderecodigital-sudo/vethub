-- ============================================================
-- VetHub — endereço estruturado (CEP, rua, número, complemento,
-- bairro, cidade, UF) para tutor e clínica.
-- O texto livre antigo migra para logradouro (nada se perde).
-- ============================================================

alter table public.tutor
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text;

update public.tutor set logradouro = endereco where endereco is not null;
alter table public.tutor drop column endereco;

alter table public.clinica
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column uf text;

update public.clinica set logradouro = endereco where endereco is not null;
alter table public.clinica drop column endereco;
