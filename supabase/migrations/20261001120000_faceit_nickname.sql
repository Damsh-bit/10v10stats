-- Nick de FACEIT de cada jugador: con él la app trae nivel, elo e historial en vivo.
alter table public.players
  add column if not exists faceit_nickname text;

comment on column public.players.faceit_nickname is
  'Nickname de FACEIT (como aparece en faceit.com/players/<nick>). Null si no juega FACEIT.';

update public.players as p
set faceit_nickname = v.nickname
from (
  values
    ('Papi', 'damsh'),
    ('Padri', 'Santhh02'),
    ('Pucha', 'Pucha01'),
    ('Foco', 'FeDestructor'),
    ('Shorsh', 'Shorsh_'),
    ('Pepo', 'Activiity'),
    ('Neitor', 'Nator22'),
    ('Tiky', 'Ezekielitooo'),
    ('Roro', 'Grafoid3'),
    ('Jey', 'jnll-'),
    ('Asta', 'LDragneel'),
    ('Kike', 'kique33')
) as v(name, nickname)
where p.name = v.name
  and p.faceit_nickname is null;
