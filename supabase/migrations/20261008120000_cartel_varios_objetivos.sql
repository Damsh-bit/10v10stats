-- ============================================================================
-- El Cartel: dedicarlo a varias personas
--
-- `objetivo_player_ids` reemplaza a `objetivo_player_id` (uno solo). La columna
-- vieja queda con el primero de la lista para que la versión anterior del sitio
-- siga andando mientras se publica la nueva; el código lee la lista y, si viene
-- vacía, cae a la columna vieja.
-- ============================================================================

alter table public.carteles
  add column if not exists objetivo_player_ids uuid[] not null default '{}';

update public.carteles
   set objetivo_player_ids = array[objetivo_player_id]
 where objetivo_player_id is not null
   and cardinality(objetivo_player_ids) = 0;

alter table public.carteles drop constraint if exists carteles_objetivos_check;
alter table public.carteles
  add constraint carteles_objetivos_check check (cardinality(objetivo_player_ids) <= 30);
