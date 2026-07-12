create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.maps (
  id text primary key,
  title text not null,
  type text not null check (type in ('hub', 'region')),
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.map_regions (
  id text primary key,
  map_id text not null default 'world-atlas' references public.maps(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (map_id, id)
);

create table public.board_games (
  id text primary key,
  title text not null,
  primary_genre text not null,
  genres text[] not null default '{}',
  theme text,
  recommended_players text,
  play_time text,
  difficulty text,
  region_id text references public.map_regions(id) on delete set null,
  source_order integer not null default 0,
  bgg_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_game_locations (
  node_id text primary key,
  game_id text unique references public.board_games(id) on delete set null,
  map_id text not null references public.maps(id) on delete cascade,
  region_id text not null references public.map_regions(id) on delete cascade,
  map_x numeric,
  map_y numeric,
  node_order integer not null,
  placement_status text not null default 'unplaced' check (placement_status in ('placed', 'unplaced', 'retired')),
  placement_method text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, node_order),
  check (map_x is null or map_x between 0 and 100),
  check (map_y is null or map_y between 0 and 100),
  check (placement_status <> 'placed' or (map_x is not null and map_y is not null))
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  active boolean not null default true,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.board_games(id) on delete restrict,
  played_at date not null,
  note text,
  created_by uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.play_session_members (
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  result text,
  score numeric,
  created_at timestamptz not null default now(),
  primary key (session_id, member_id)
);

create index board_games_region_id_idx on public.board_games(region_id);
create index board_game_locations_map_id_idx on public.board_game_locations(map_id);
create index board_game_locations_region_id_idx on public.board_game_locations(region_id);
create index play_sessions_game_played_at_idx on public.play_sessions(game_id, played_at desc);
create index play_session_members_member_id_idx on public.play_session_members(member_id);

create view public.game_progress
with (security_invoker = true)
as
select
  bg.id as game_id,
  count(distinct ps.id)::integer as play_count,
  max(ps.played_at) as last_played_at,
  count(distinct psm.member_id)::integer as participant_count,
  case
    when count(distinct ps.id) >= 10 then 'gold'
    when count(distinct ps.id) >= 5 then 'silver'
    when count(distinct ps.id) >= 1 then 'bronze'
    else 'locked'
  end as status
from public.board_games bg
left join public.play_sessions ps on ps.game_id = bg.id
left join public.play_session_members psm on psm.session_id = ps.id
group by bg.id;

create trigger maps_set_updated_at before update on public.maps for each row execute function public.set_updated_at();
create trigger map_regions_set_updated_at before update on public.map_regions for each row execute function public.set_updated_at();
create trigger board_games_set_updated_at before update on public.board_games for each row execute function public.set_updated_at();
create trigger board_game_locations_set_updated_at before update on public.board_game_locations for each row execute function public.set_updated_at();
create trigger members_set_updated_at before update on public.members for each row execute function public.set_updated_at();
create trigger play_sessions_set_updated_at before update on public.play_sessions for each row execute function public.set_updated_at();

alter table public.maps enable row level security;
alter table public.map_regions enable row level security;
alter table public.board_games enable row level security;
alter table public.board_game_locations enable row level security;
alter table public.members enable row level security;
alter table public.play_sessions enable row level security;
alter table public.play_session_members enable row level security;

create policy "Public can read maps" on public.maps for select to anon, authenticated using (true);
create policy "Public can read map regions" on public.map_regions for select to anon, authenticated using (true);
create policy "Public can read board games" on public.board_games for select to anon, authenticated using (true);
create policy "Public can read locations" on public.board_game_locations for select to anon, authenticated using (true);
create policy "Public can read members" on public.members for select to anon, authenticated using (true);
create policy "Public can read sessions" on public.play_sessions for select to anon, authenticated using (true);
create policy "Public can read participants" on public.play_session_members for select to anon, authenticated using (true);

create policy "Members can update themselves" on public.members
for update to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

create policy "Members can create sessions" on public.play_sessions
for insert to authenticated
with check (exists (
  select 1 from public.members m
  where m.id = created_by and m.auth_user_id = (select auth.uid()) and m.active
));

create policy "Session creators can update sessions" on public.play_sessions
for update to authenticated
using (exists (
  select 1 from public.members m
  where m.id = created_by and m.auth_user_id = (select auth.uid()) and m.active
))
with check (exists (
  select 1 from public.members m
  where m.id = created_by and m.auth_user_id = (select auth.uid()) and m.active
));

create policy "Session creators can delete sessions" on public.play_sessions
for delete to authenticated
using (exists (
  select 1 from public.members m
  where m.id = created_by and m.auth_user_id = (select auth.uid()) and m.active
));

create policy "Session creators can add participants" on public.play_session_members
for insert to authenticated
with check (exists (
  select 1
  from public.play_sessions ps
  join public.members m on m.id = ps.created_by
  where ps.id = session_id and m.auth_user_id = (select auth.uid()) and m.active
));

create policy "Session creators can update participants" on public.play_session_members
for update to authenticated
using (exists (
  select 1
  from public.play_sessions ps
  join public.members m on m.id = ps.created_by
  where ps.id = session_id and m.auth_user_id = (select auth.uid()) and m.active
))
with check (exists (
  select 1
  from public.play_sessions ps
  join public.members m on m.id = ps.created_by
  where ps.id = session_id and m.auth_user_id = (select auth.uid()) and m.active
));

create policy "Session creators can delete participants" on public.play_session_members
for delete to authenticated
using (exists (
  select 1
  from public.play_sessions ps
  join public.members m on m.id = ps.created_by
  where ps.id = session_id and m.auth_user_id = (select auth.uid()) and m.active
));

grant usage on schema public to anon, authenticated;
grant select on public.maps, public.map_regions, public.board_games, public.board_game_locations,
  public.members, public.play_sessions, public.play_session_members, public.game_progress to anon, authenticated;
grant update on public.members to authenticated;
grant insert, update, delete on public.play_sessions, public.play_session_members to authenticated;
