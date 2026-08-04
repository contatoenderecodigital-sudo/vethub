-- ============================================================
-- VetHub — grants de acesso à API (PostgREST)
-- Projetos novos do Supabase não concedem privilégios automáticos
-- em tabelas criadas via migração. Os grants abaixo liberam o
-- acesso por papel de API; o ISOLAMENTO continua 100% no RLS.
-- `anon` não recebe nada: sem login, sem dados (o cadastro de
-- clínica roda no servidor com service_role).
-- ============================================================

grant usage on schema public to authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- Tabelas futuras criadas pelo role postgres herdam os mesmos grants
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;
