-- Soft-delete (trash). Pages with a non-null deleted_at are in the trash and
-- hidden from the archive; they can be restored or permanently deleted.
alter table public.pages add column if not exists deleted_at timestamptz;
create index if not exists pages_deleted_idx on public.pages(user_id, deleted_at);
