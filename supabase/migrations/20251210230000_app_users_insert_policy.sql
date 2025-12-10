-- Allow a newly authenticated user to bootstrap their whitelist row
-- without already being present in app_users (fixes join/whitelist race).
drop policy if exists app_users_insert_self on public.app_users;
create policy app_users_insert_self
on public.app_users
for insert
to authenticated
with check (auth.uid() = user_id);


