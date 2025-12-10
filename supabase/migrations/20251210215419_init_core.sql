-- Enable required extensions (Supabase already has pgcrypto)
create extension if not exists pgcrypto;

-- Whitelist of allowed users
create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null
);

-- Ingredients (per-user)
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ingredients_user_name_idx on public.ingredients (user_id, name);

-- Recipes (global, co-editable, attributed)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  instructions text,
  servings int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipe ingredients
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null,
  allows_alternatives boolean not null default false
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- Alternatives per recipe ingredient (recipe-scoped)
create table if not exists public.recipe_ingredient_alternatives (
  id uuid primary key default gen_random_uuid(),
  recipe_ingredient_id uuid not null references public.recipe_ingredients(id) on delete cascade,
  alternative_name text not null,
  conversion_ratio numeric(12,3) not null check (conversion_ratio > 0),
  notes text
);
create index if not exists ria_ri_idx on public.recipe_ingredient_alternatives (recipe_ingredient_id);

-- Grocery lists (per-user)
create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed boolean not null default false,
  week_starting date
);
create index if not exists grocery_lists_user_created_idx on public.grocery_lists (user_id, created_at desc);

create table if not exists public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  ingredient_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null,
  purchased boolean not null default false
);
create index if not exists gli_gl_idx on public.grocery_list_items (grocery_list_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_ingredients_updated_at on public.ingredients;
create trigger trg_ingredients_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

drop trigger if exists trg_recipes_updated_at on public.recipes;
create trigger trg_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

-- RLS
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredient_alternatives enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;
alter table public.app_users enable row level security;

-- Gate: Only whitelisted users can access anything
create policy app_users_select_self on public.app_users
  for select
  using (auth.uid() = user_id);

-- Helper check used in policies
create or replace view public.current_user_is_allowed as
  select exists (
    select 1 from public.app_users au where au.user_id = auth.uid()
  ) as allowed;

-- Ingredients (per-user)
create policy ingredients_select on public.ingredients for select
  using (auth.uid() = user_id and exists(select 1 from public.app_users au where au.user_id = auth.uid()));
create policy ingredients_modify on public.ingredients for all
  using (auth.uid() = user_id and exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (auth.uid() = user_id);

-- Recipes (global, co-editable by allowed users)
create policy recipes_read on public.recipes for select
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));
create policy recipes_write on public.recipes for all
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

-- Recipe ingredients
create policy ri_read on public.recipe_ingredients for select
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));
create policy ri_write on public.recipe_ingredients for all
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

-- Alternatives
create policy ria_read on public.recipe_ingredient_alternatives for select
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));
create policy ria_write on public.recipe_ingredient_alternatives for all
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

-- Grocery lists (per-user)
create policy gl_read on public.grocery_lists for select
  using (auth.uid() = user_id and exists(select 1 from public.app_users au where au.user_id = auth.uid()));
create policy gl_write on public.grocery_lists for all
  using (auth.uid() = user_id and exists(select 1 from public.app_users au where au.user_id = auth.uid()))
  with check (auth.uid() = user_id);

create policy gli_read on public.grocery_list_items for select
  using (
    exists(
      select 1 from public.grocery_lists gl
      where gl.id = grocery_list_id and gl.user_id = auth.uid()
    )
    and exists(select 1 from public.app_users au where au.user_id = auth.uid())
  );
create policy gli_write on public.grocery_list_items for all
  using (
    exists(
      select 1 from public.grocery_lists gl
      where gl.id = grocery_list_id and gl.user_id = auth.uid()
    )
    and exists(select 1 from public.app_users au where au.user_id = auth.uid())
  )
  with check (
    exists(
      select 1 from public.grocery_lists gl
      where gl.id = grocery_list_id and gl.user_id = auth.uid()
    )
  );
