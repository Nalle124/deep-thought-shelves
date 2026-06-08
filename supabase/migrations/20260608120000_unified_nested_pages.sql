-- Unify folders + pages into a single self-nesting "pages" tree (Notion model).
-- Any page can contain other pages; a page that has children behaves as a folder.
-- NOTE: this drops the old folders/pages tables. Safe here because the archive
-- has no real content yet (content arrives via the Notion import).

drop table if exists public.pages cascade;
drop table if exists public.folders cascade;

create table public.pages (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  parent_id uuid references public.pages(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.pages to authenticated;
grant all on public.pages to service_role;

alter table public.pages enable row level security;
create policy "own pages" on public.pages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index pages_user_parent_idx on public.pages(user_id, parent_id);

create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();
