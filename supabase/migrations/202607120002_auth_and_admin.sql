alter table public.members
  add column role text not null default 'member'
  check (role in ('member', 'admin'));

create function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where auth_user_id = (select auth.uid())
      and active
      and role = 'admin'
  );
$$;

revoke all on function public.is_current_admin() from public;
grant execute on function public.is_current_admin() to authenticated;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (display_name, auth_user_id)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Member'),
    new.id
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create policy "Admins can manage maps" on public.maps for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage map regions" on public.map_regions for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage board games" on public.board_games for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage locations" on public.board_game_locations for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage members" on public.members for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage sessions" on public.play_sessions for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));
create policy "Admins can manage participants" on public.play_session_members for all to authenticated
using ((select public.is_current_admin())) with check ((select public.is_current_admin()));

grant insert, update, delete on public.maps, public.map_regions, public.board_games,
  public.board_game_locations, public.members to authenticated;

