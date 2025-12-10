-- Add DELETE policy for ingredient_names (all whitelisted users can delete)
create policy ingredient_names_delete on public.ingredient_names for delete
  using (exists(select 1 from public.app_users au where au.user_id = auth.uid()));

