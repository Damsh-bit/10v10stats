-- Historial de FACEIT guardado: cada vez que FACEIT responde se suman las
-- partidas nuevas, así el historial y el gráfico de elo no dependen de que
-- FACEIT conteste justo cuando se arma la página.

create table if not exists public.faceit_matches (
  player_id uuid not null references public.players(id) on delete cascade,
  match_id text not null,
  played_at timestamptz not null,
  map text not null,
  won boolean not null,
  team_score integer not null default 0,
  enemy_score integer not null default 0,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  kd numeric(5, 2) not null default 0,
  adr numeric(6, 1) not null default 0,
  hs_pct integer not null default 0,
  -- Elo después de la partida (null si la fuente no lo informa).
  elo integer,
  elo_delta integer,
  team_id text,
  updated_at timestamptz not null default now(),
  primary key (player_id, match_id)
);

create index if not exists faceit_matches_player_played_idx
  on public.faceit_matches (player_id, played_at desc);

-- Elo actual registrado en cada sincronización en la que cambió.
create table if not exists public.faceit_elo_snapshots (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  elo integer not null,
  level integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists faceit_elo_snapshots_player_recorded_idx
  on public.faceit_elo_snapshots (player_id, recorded_at desc);

-- Datos públicos de FACEIT: lectura libre, escritura sólo con la service role.
alter table public.faceit_matches enable row level security;
alter table public.faceit_elo_snapshots enable row level security;

drop policy if exists "faceit_matches lectura publica" on public.faceit_matches;
create policy "faceit_matches lectura publica" on public.faceit_matches for select using (true);

drop policy if exists "faceit_elo_snapshots lectura publica" on public.faceit_elo_snapshots;
create policy "faceit_elo_snapshots lectura publica" on public.faceit_elo_snapshots for select using (true);
