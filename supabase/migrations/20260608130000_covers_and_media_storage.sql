-- Page covers + a Storage bucket for uploaded images (editor images and covers).

-- 1) cover column on pages (stores "preset:<id>" or an uploaded image URL).
alter table public.pages add column if not exists cover text;

-- 2) public media bucket (images render via their public URL; paths are random
--    UUIDs so they are not enumerable).
insert into storage.buckets (id, name, public)
values ('page-media', 'page-media', true)
on conflict (id) do nothing;

-- 3) each user may write only under their own folder (<uid>/<file>). Reads happen
--    via the public URL, so no select policy is needed.
drop policy if exists "own media insert" on storage.objects;
drop policy if exists "own media update" on storage.objects;
drop policy if exists "own media delete" on storage.objects;

create policy "own media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'page-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media update" on storage.objects for update to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = auth.uid()::text);
