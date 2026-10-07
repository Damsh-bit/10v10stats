-- ============================================================================
-- Perfil de jugador: "me gusta" y recomendaciones anónimas
--
-- * `player_likes`: un me gusta por navegador y por jugador. El navegador
--   guarda un id al azar (`device_id`); sacar el me gusta borra la fila.
-- * `player_recommendations`: recomendaciones anónimas que cualquiera le deja
--   a un jugador en su perfil.
-- * `player_recommendation_reports`: un reporte por navegador. Con 3 reportes
--   la recomendación se oculta sola.
--
-- Como las apuestas y el cartel: RLS sin políticas, sólo el servidor (service
-- role) lee y escribe. `ip_hash` (sha256 con sal del servidor) sirve para
-- frenar el spam sin guardar la IP.
-- ============================================================================

create table if not exists public.player_likes (
  player_id uuid not null references public.players (id) on delete cascade,
  device_id uuid not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  primary key (player_id, device_id)
);

create index if not exists player_likes_ip_idx on public.player_likes (ip_hash, created_at desc);

create table if not exists public.player_recommendations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  content text not null check (char_length(content) between 3 and 280),
  ip_hash text,
  reports integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists player_recommendations_player_idx
  on public.player_recommendations (player_id, created_at desc)
  where not hidden;
create index if not exists player_recommendations_ip_idx on public.player_recommendations (ip_hash, created_at desc);

create table if not exists public.player_recommendation_reports (
  recommendation_id uuid not null references public.player_recommendations (id) on delete cascade,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (recommendation_id, device_id)
);

alter table public.player_likes enable row level security;
alter table public.player_recommendations enable row level security;
alter table public.player_recommendation_reports enable row level security;

-- ─── Reportar una recomendación ─────────────────────────────────────────────
-- Un reporte por navegador; al tercero se oculta. Devuelve si quedó oculta.
create or replace function public.player_recommendation_report(p_recommendation uuid, p_device uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_hidden boolean;
begin
  insert into public.player_recommendation_reports (recommendation_id, device_id)
  values (p_recommendation, p_device)
  on conflict do nothing;

  select count(*) into v_total
    from public.player_recommendation_reports
   where recommendation_id = p_recommendation;

  update public.player_recommendations
     set reports = v_total, hidden = hidden or v_total >= 3
   where id = p_recommendation
  returning hidden into v_hidden;

  return coalesce(v_hidden, false);
end;
$$;

revoke all on function public.player_recommendation_report(uuid, uuid) from public, anon, authenticated;
grant execute on function public.player_recommendation_report(uuid, uuid) to service_role;
