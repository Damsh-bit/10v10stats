-- Homenaje QEPD: los que ya no juegan más salen de la ladder de la temporada en
-- curso y pasan al apartado de homenaje de la home. En las temporadas cerradas
-- siguen en la tabla final, y sus partidas cuentan para todo lo demás.
alter table public.players
  add column if not exists qepd boolean not null default false;

comment on column public.players.qepd is
  'Ya no juega más: fuera de la ladder de la temporada en curso y en el homenaje QEPD de la home.';

update public.players set qepd = true where name in ('Tiky', 'Foco');
