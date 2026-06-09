-- Make page media private (no public browsing). Images are served via long-lived
-- signed URLs created at upload time. Add a read policy so the owner can sign URLs.
update storage.buckets set public = false where id = 'page-media';

drop policy if exists "own media read" on storage.objects;
create policy "own media read" on storage.objects for select to authenticated
  using (bucket_id = 'page-media' and (storage.foldername(name))[1] = auth.uid()::text);
