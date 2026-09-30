-- ============================================================================
-- Sistema de temporadas (Season 1 → Season 2)
--
-- * `seasons`: catálogo de temporadas. Solo una puede estar activa (is_current).
-- * `matches.season_id`: cada partida pertenece a una temporada. El default
--   apunta a la temporada activa, así que la app no necesita mandarlo.
--   match_players hereda la temporada vía su partida.
-- * `season_player_snapshots`: foto de los contadores que viven en tablas
--   "vivas" y se resetean al cambiar de temporada (Nelson, Fakasos, MVPs).
-- * `start_new_season()`: cierra la temporada activa, guarda el snapshot,
--   resetea los contadores y abre la siguiente. Solo la puede ejecutar el
--   service role.
-- ============================================================================

create table if not exists public.seasons (
  id smallint primary key,
  slug text not null unique,
  name text not null,
  tagline text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint seasons_dates_check check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists seasons_single_current_idx
  on public.seasons (is_current) where is_current;

alter table public.seasons enable row level security;

drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons
  for select using (true);

create or replace function public.current_season_id()
returns smallint
language sql
stable
set search_path = ''
as $$
  select id from public.seasons where is_current order by id desc limit 1
$$;

-- Season 1 arranca con la primera partida registrada.
insert into public.seasons (id, slug, name, tagline, starts_at, is_current)
select 1, 'season-1', 'Season 1', 'La temporada fundacional', coalesce(min(played_at), now()), true
from public.matches
on conflict (id) do nothing;

alter table public.matches
  add column if not exists season_id smallint references public.seasons (id);

update public.matches set season_id = 1 where season_id is null;

alter table public.matches alter column season_id set default public.current_season_id();
alter table public.matches alter column season_id set not null;

create index if not exists matches_season_played_at_idx
  on public.matches (season_id, played_at desc);

create index if not exists match_players_player_id_idx
  on public.match_players (player_id);

create table if not exists public.season_player_snapshots (
  season_id smallint not null references public.seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  nelson_points integer not null default 0,
  fake_count integer not null default 0,
  mvps integer not null default 0,
  captured_at timestamptz not null default now(),
  primary key (season_id, player_id)
);

alter table public.season_player_snapshots enable row level security;

drop policy if exists "public read season snapshots" on public.season_player_snapshots;
create policy "public read season snapshots" on public.season_player_snapshots
  for select using (true);

create or replace function public.start_new_season(
  p_name text,
  p_slug text,
  p_tagline text default null,
  p_starts_at timestamptz default now()
)
returns smallint
language plpgsql
set search_path = ''
as $$
declare
  v_current smallint;
  v_next smallint;
begin
  select id into v_current from public.seasons where is_current for update;
  if v_current is null then
    raise exception 'No hay una temporada activa para cerrar';
  end if;

  insert into public.season_player_snapshots (season_id, player_id, nelson_points, fake_count, mvps)
  select
    v_current,
    p.id,
    coalesce(p.contador_nelson, 0)::integer,
    coalesce(f.fake_count, 0),
    coalesce(p.mvps, 0)::integer
  from public.players p
  left join public.fake_leaderboard f on lower(f.player_name) = lower(p.name)
  on conflict (season_id, player_id) do update set
    nelson_points = excluded.nelson_points,
    fake_count = excluded.fake_count,
    mvps = excluded.mvps,
    captured_at = now();

  update public.seasons
  set is_current = false, ends_at = p_starts_at
  where id = v_current;

  v_next := v_current + 1;
  insert into public.seasons (id, slug, name, tagline, starts_at, is_current)
  values (v_next, p_slug, p_name, p_tagline, p_starts_at, true);

  -- Contadores "vivos" arrancan de cero. contador_nelson queda en 0 (no null)
  -- porque la app usa el badge como fallback cuando es null.
  update public.players set contador_nelson = 0, mvps = 0 where true;
  update public.fake_leaderboard set fake_count = 0 where true;
  update public.nelson_vote_state
  set active = false,
      started_at = null,
      started_by = null,
      vote_id = null,
      voters = '{}'::jsonb,
      vote_counts = '{}'::jsonb,
      winner_player_id = null,
      winner_name = null,
      closed_at = null,
      last_updated_at = now()
  where true;

  return v_next;
end;
$$;

revoke all on function public.start_new_season(text, text, text, timestamptz) from public, anon, authenticated;

-- Fin de la Season 1 y arranque de la Season 2 (30/09/2026). Las fechas de
-- partida se guardan a medianoche UTC, por eso el corte también va en UTC.
select public.start_new_season('Season 2', 'season-2', 'Todos arrancan de cero', '2026-09-30 00:00:00+00');
