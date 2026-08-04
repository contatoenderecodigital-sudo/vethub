-- ============================================================
-- VetHub — Fase 1: bucket privado de anexos
-- Caminho dos arquivos: {clinica_id}/{consulta_id}/{arquivo}
-- A primeira pasta do caminho é o tenant — as policies validam isso.
-- Visualização sempre via URL assinada (bucket privado).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  10485760, -- 10 MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "anexos: leitura da propria clinica"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = (select public.clinica_do_usuario())::text
  );

create policy "anexos: upload na propria clinica"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = (select public.clinica_do_usuario())::text
  );

create policy "anexos: remocao da propria clinica"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = (select public.clinica_do_usuario())::text
  );
