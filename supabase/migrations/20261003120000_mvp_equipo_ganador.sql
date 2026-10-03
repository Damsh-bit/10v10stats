-- ============================================================================
-- Regla del MVP: desde la Season 2 sólo puede salir del equipo ganador.
--
-- El MVP es el mejor puntaje (K + A) / D + daño / 100, pero ahora sólo entre
-- los que ganaron el mapa (en un empate compiten los diez). La app ya lo
-- calcula así al cargar y al editar (lib/mvp.ts); esto recalcula las partidas
-- de la Season 2 en adelante que ya estaban cargadas. La Season 1 no se toca.
-- ============================================================================

with candidates as (
  select
    mp.match_id,
    mp.player_id,
    row_number() over (
      partition by mp.match_id
      order by (coalesce(mp.kills, 0) + coalesce(mp.assists, 0))::numeric / greatest(1, coalesce(mp.deaths, 0))
        + coalesce(mp.damage, 0)::numeric / 100 desc
    ) as position
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where m.season_id >= 2
    and not mp.is_guest
    and (
      mp.won is true
      or not exists (
        select 1 from public.match_players w where w.match_id = mp.match_id and w.won is true
      )
    )
)
update public.matches m
set mvp_id = c.player_id
from candidates c
where c.match_id = m.id
  and c.position = 1
  and m.mvp_id is distinct from c.player_id;

-- players.mvps es el contador "vivo" de la temporada activa (se guarda en el
-- snapshot al cerrarla): se rearma con los MVPs ya corregidos.
update public.players p
set mvps = coalesce(
  (select count(*) from public.matches m where m.season_id = public.current_season_id() and m.mvp_id = p.id),
  0
)
where true;
