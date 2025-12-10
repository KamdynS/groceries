-- Global ingredients table (master list of ingredient names)
create table if not exists public.ingredient_names (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);
create index if not exists ingredient_names_name_idx on public.ingredient_names (name);

-- Enable RLS
alter table public.ingredient_names enable row level security;

-- All whitelisted users can read ingredient names
create policy ingredient_names_read on public.ingredient_names for select
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

-- All whitelisted users can insert new ingredient names
create policy ingredient_names_insert on public.ingredient_names for insert
  with check (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

