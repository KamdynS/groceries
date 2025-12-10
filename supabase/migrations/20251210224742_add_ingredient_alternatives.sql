-- Global ingredient alternatives (standard alternatives that auto-attach to recipes)
create table if not exists public.ingredient_alternatives (
  id uuid primary key default gen_random_uuid(),
  ingredient_name text not null references public.ingredient_names(name) on delete cascade,
  alternative_name text not null references public.ingredient_names(name) on delete cascade,
  conversion_ratio numeric(12,3) not null check (conversion_ratio > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(ingredient_name, alternative_name)
);
create index if not exists ingredient_alternatives_ingredient_idx on public.ingredient_alternatives (ingredient_name);
create index if not exists ingredient_alternatives_alternative_idx on public.ingredient_alternatives (alternative_name);

-- Enable RLS
alter table public.ingredient_alternatives enable row level security;

-- All whitelisted users can read/write ingredient alternatives
create policy ingredient_alternatives_read on public.ingredient_alternatives for select
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

create policy ingredient_alternatives_write on public.ingredient_alternatives for all
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

