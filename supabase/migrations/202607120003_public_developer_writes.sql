-- Prototype mode: anyone with the public Developer Console may edit shared play data.
create policy "Public can create members" on public.members for insert to anon, authenticated with check (true);
create policy "Public can update members" on public.members for update to anon, authenticated using (true) with check (true);
create policy "Public can delete members" on public.members for delete to anon, authenticated using (true);
create policy "Public can create sessions" on public.play_sessions for insert to anon, authenticated with check (true);
create policy "Public can update sessions" on public.play_sessions for update to anon, authenticated using (true) with check (true);
create policy "Public can delete sessions" on public.play_sessions for delete to anon, authenticated using (true);
create policy "Public can create participants" on public.play_session_members for insert to anon, authenticated with check (true);
create policy "Public can update participants" on public.play_session_members for update to anon, authenticated using (true) with check (true);
create policy "Public can delete participants" on public.play_session_members for delete to anon, authenticated using (true);
grant insert, update, delete on public.members, public.play_sessions, public.play_session_members to anon;
