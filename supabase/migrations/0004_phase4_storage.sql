-- =====================================================================
-- Phase 4 (Track A) migration: media storage bucket + policies.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

-- Public bucket for all generated media (audio, images, thumbnails, subtitles).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Authenticated users may write/manage only objects inside their own folder,
-- where the first path segment equals their user id (e.g. "<uid>/audio/x.wav").
drop policy if exists "media_insert_own" on storage.objects;
create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (the bucket is public; this also covers the storage API select).
drop policy if exists "media_select_public" on storage.objects;
create policy "media_select_public" on storage.objects
  for select using (bucket_id = 'media');
