-- Per-user JSON blob for home-screen data (weekly schedule notes + training goals).
create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.user_state to authenticated;
grant all on public.user_state to service_role;

alter table public.user_state enable row level security;
drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
