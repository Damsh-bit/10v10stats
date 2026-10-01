-- Badge "💩 Menuda mierda" fijo, aparte del que se lleva el último de la ladder.
alter table public.players
  add column if not exists menuda_mierda boolean not null default false;

comment on column public.players.menuda_mierda is
  'Muestra el badge "Menuda mierda" en el perfil y en las ladders, sin importar el puesto.';

update public.players set menuda_mierda = true where name = 'Tiky';
