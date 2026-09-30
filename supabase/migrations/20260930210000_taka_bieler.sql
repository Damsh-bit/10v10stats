-- ============================================================================
-- Sergio Vergara pasa a ser Taka Bieler, un jugador nuevo desde la Season 2.
--
-- Sergio jugó algunas partidas de invitado en la Season 1 y siempre estuvo
-- fuera del ladder y de los récords. Su registro de jugador se reutiliza para
-- Taka, así que esas participaciones se marcan como de invitado: siguen en el
-- tabulador de cada partida pero no suman en ninguna estadística.
-- ============================================================================

alter table public.match_players
  add column if not exists is_guest boolean not null default false;

update public.match_players mp
set is_guest = true
from public.players p
where p.id = mp.player_id
  and lower(p.name) = 'sergio vergara';

-- Jugador nuevo: nombre nuevo, sin la foto ni el apodo del anterior.
-- (La foto sigue guardada en el bucket de Storage.)
update public.fake_leaderboard
set player_name = 'Taka Bieler'
where lower(player_name) = 'sergio vergara';

update public.players
set name = 'Taka Bieler',
    photo_url = null,
    badge = null,
    contador_nelson = 0,
    mvps = 0
where lower(name) = 'sergio vergara';
