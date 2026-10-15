-- ============================================================================
-- Partidas de Xplay
--
-- Desde la Season 2 las partidas se cargan con el link de Xplay: de ahí (y de
-- SCOPE.GG, que procesa la demo) salen las cifras de cada jugador, las rondas y
-- cada kill. `match_players` se sigue llenando igual, con los números de Xplay,
-- así la ladder, los récords y los perfiles no cambian de fuente.
--
-- * `players.steam_account_id`: la cuenta de Steam (SteamID3) que une al
--   jugador de Xplay con el del sitio. Se completa sola al cargar partidas.
-- * `xplay_matches`: una fila por partida con link de Xplay. Las rondas y el
--   resumen de cada equipo van en jsonb (sólo se leen en la página de la
--   partida). `has_stats` es false si SCOPE no pudo procesar la demo.
-- * `xplay_match_players`: los 10 de Xplay con sus cifras completas.
-- * `xplay_kills`: cada kill (de acá salen los duelos). Sin posiciones ni
--   granadas, para que la base no crezca de más.
--
-- Datos públicos: lectura libre, escritura sólo con la service role.
-- ============================================================================

alter table public.players
  add column if not exists steam_account_id bigint unique;

comment on column public.players.steam_account_id is
  'Cuenta de Steam (SteamID3) con la que juega en Xplay.';

create table if not exists public.xplay_matches (
  match_id uuid primary key references public.matches (id) on delete cascade,
  hash text not null unique,
  xplay_id bigint,
  scope_match_id text,
  map_name text not null,
  started_at timestamptz,
  parse_state text,
  has_stats boolean not null default false,
  demo_url text,
  score_team1 smallint not null default 0,
  score_team2 smallint not null default 0,
  -- Qué equipo de Xplay (1 o 2) es el "Equipo A" (score_ct) de la partida.
  team_a smallint not null default 1 check (team_a in (1, 2)),
  rounds_in_half smallint,
  rounds jsonb not null default '[]'::jsonb,
  teams jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now()
);

create table if not exists public.xplay_match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  account_id bigint not null,
  player_id uuid references public.players (id) on delete set null,
  name text not null,
  avatar_url text,
  team smallint not null check (team in (1, 2)),
  faceit_elo integer,
  faceit_level smallint,
  kills integer,
  deaths integer,
  assists integer,
  damage integer,
  adr numeric(6, 1),
  rating numeric(5, 2),
  kast numeric(5, 1),
  hs_pct numeric(5, 1),
  mvps integer,
  opening_kills integer,
  trade_kills integer,
  clutches_won integer,
  -- Todas las cifras de SCOPE: la partida entera y cada lado.
  stats jsonb,
  primary key (match_id, account_id)
);

create index if not exists xplay_match_players_player_idx on public.xplay_match_players (player_id);
create index if not exists xplay_match_players_account_idx on public.xplay_match_players (account_id);

create table if not exists public.xplay_kills (
  match_id uuid not null references public.matches (id) on delete cascade,
  round smallint not null,
  seq smallint not null,
  -- Segundos desde que termina el freezetime.
  at_second real,
  killer bigint,
  victim bigint not null,
  assister bigint,
  weapon smallint not null default 0,
  headshot boolean not null default false,
  opening boolean not null default false,
  traded boolean not null default false,
  team_kill boolean not null default false,
  primary key (match_id, round, seq)
);

create index if not exists xplay_kills_killer_idx on public.xplay_kills (killer);
create index if not exists xplay_kills_victim_idx on public.xplay_kills (victim);

alter table public.xplay_matches enable row level security;
alter table public.xplay_match_players enable row level security;
alter table public.xplay_kills enable row level security;

drop policy if exists "xplay_matches lectura publica" on public.xplay_matches;
create policy "xplay_matches lectura publica" on public.xplay_matches for select using (true);

drop policy if exists "xplay_match_players lectura publica" on public.xplay_match_players;
create policy "xplay_match_players lectura publica" on public.xplay_match_players for select using (true);

drop policy if exists "xplay_kills lectura publica" on public.xplay_kills;
create policy "xplay_kills lectura publica" on public.xplay_kills for select using (true);
