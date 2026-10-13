-- Jugadores inactivos: no aparecen en la ladder (ni en el líder, los podios o
-- las peleas por el puesto), pero sus partidas siguen contando para todo lo demás.
alter table public.players
  add column if not exists inactivo boolean not null default false;

comment on column public.players.inactivo is
  'Lo saca de la ladder; sus partidas siguen sumando en récords, perfiles y el generador de equipos.';

update public.players set inactivo = true where name = 'Taka Bieler';
