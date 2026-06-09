-- Per-page typography style ("classic" | "modern" | "grand"; null = classic).
alter table public.pages add column if not exists style text;
