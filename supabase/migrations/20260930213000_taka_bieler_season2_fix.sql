-- La migración anterior marcó como invitado todas las participaciones del
-- registro de Sergio Vergara, incluida una partida de la Season 2 que se cargó
-- antes del renombre y que en realidad jugó Taka Bieler. Solo las de la
-- Season 1 son de invitado.
update public.match_players mp
set is_guest = false
from public.matches m, public.players p
where m.id = mp.match_id
  and p.id = mp.player_id
  and p.name = 'Taka Bieler'
  and m.season_id <> 1
  and mp.is_guest;
