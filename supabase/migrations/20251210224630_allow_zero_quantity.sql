-- Allow quantity 0 for "no measurement" ingredients
alter table public.recipe_ingredients
  drop constraint if exists recipe_ingredients_quantity_check;

alter table public.recipe_ingredients
  add constraint recipe_ingredients_quantity_check
  check (quantity >= 0);

