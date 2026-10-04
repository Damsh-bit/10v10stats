-- ============================================================================
-- El Cartel: donaciones que compran el cartel de la home
--
-- Cualquiera dona con Mercado Pago y su cartel (mensaje, foto, a quién va
-- dirigido) queda arriba de todo en la home hasta que otro ponga MÁS plata.
--
-- * `carteles`: una fila por intento. Nace `pendiente` al abrir el checkout;
--   con el pago aprobado pasa a `pagado` sólo si supera al cartel vigente.
--   Si alguien le ganó de mano mientras pagaba, queda `a_devolver` y se
--   reembolsa (`devuelto`). El cartel de la home es el `pagado` no oculto de
--   mayor monto; el precio para sacarlo sale del mayor `pagado` (oculto o no).
-- * `carteles_log`: auditoría de lo que mueve plata (pagos, reembolsos,
--   moderación).
--
-- Como las apuestas: RLS sin políticas, sólo el servidor (service role) lee
-- y escribe.
-- ============================================================================

create table if not exists public.carteles (
  id uuid primary key default gen_random_uuid(),
  -- Cómo firma ("Anónimo", un nombre libre o el de un jugador).
  autor text not null check (char_length(autor) between 1 and 40),
  autor_player_id uuid references public.players (id) on delete set null,
  -- A quién va dirigido (opcional): sale con su foto en el cartel.
  objetivo_player_id uuid references public.players (id) on delete set null,
  mensaje text not null check (char_length(mensaje) between 1 and 200),
  imagen_url text,
  -- Ruta en el bucket público `tabulador` (para borrarla si nunca se pagó).
  imagen_path text,
  estilo text not null default 'fuego' check (estilo in ('fuego', 'neon', 'oro', 'toxico')),
  monto numeric(12, 2) not null,
  -- mercadopago · prueba (sólo `next dev`) · casa (el cartel de ejemplo).
  proveedor text not null default 'mercadopago' check (proveedor in ('mercadopago', 'prueba', 'casa')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'a_devolver', 'devuelto')),
  -- Por qué terminó en a_devolver/devuelto: superado · monto · revertido.
  motivo text,
  oculto boolean not null default false,
  oculto_at timestamptz,
  checkout_id text,
  checkout_url text,
  -- Precio mínimo cuando se abrió el checkout (informativo).
  precio_al_crear numeric(12, 2),
  vence_at timestamptz,
  pago_id text unique,
  monto_neto numeric(12, 2),
  reembolso_id text,
  pagado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carteles_monto_check check (monto > 0 or proveedor = 'casa')
);

create index if not exists carteles_pagados_idx on public.carteles (monto desc) where estado = 'pagado';
create index if not exists carteles_estado_idx on public.carteles (estado, created_at desc);

create table if not exists public.carteles_log (
  id bigint generated always as identity primary key,
  tipo text not null,
  cartel_id uuid references public.carteles (id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists carteles_log_cartel_idx on public.carteles_log (cartel_id, created_at desc);

alter table public.carteles enable row level security;
alter table public.carteles_log enable row level security;

-- ─── Aplicar un pago aprobado ───────────────────────────────────────────────
-- Atómico y de a uno (advisory lock): dos carteles pagados al mismo tiempo por
-- el mismo precio no pueden quedarse los dos con el cartel. Devuelve:
--   pagado         → es el nuevo cartel
--   superado       → alguien pagó más (o lo mismo) antes: a devolver
--   monto_distinto → Mercado Pago cobró otro monto: a devolver
--   repetido       → ese pago ya estaba aplicado (webhook repetido)
--   otro_pago      → el cartel ya tenía otro pago: este hay que devolverlo
--   no_pendiente / no_existe
-- El entorno local usa la misma base: lo `prueba` sólo se ve en `next dev`.
create or replace function public.cartel_aplicar_pago(
  p_cartel uuid,
  p_pago_id text,
  p_monto numeric,
  p_neto numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.carteles%rowtype;
  v_max numeric;
begin
  perform pg_advisory_xact_lock(hashtext('cartel_aplicar_pago'));

  select * into v_row from public.carteles where id = p_cartel for update;
  if not found then
    return 'no_existe';
  end if;

  if v_row.pago_id is not null then
    return case when v_row.pago_id = p_pago_id then 'repetido' else 'otro_pago' end;
  end if;

  if v_row.estado <> 'pendiente' then
    return 'no_pendiente';
  end if;

  if abs(p_monto - v_row.monto) > 0.01 then
    update public.carteles
       set pago_id = p_pago_id, monto_neto = p_neto, estado = 'a_devolver', motivo = 'monto', updated_at = now()
     where id = p_cartel;
    return 'monto_distinto';
  end if;

  -- Los pagos simulados de `next dev` (proveedor prueba) nunca le suben el precio a uno real.
  select coalesce(max(monto), 0) into v_max
    from public.carteles
   where estado = 'pagado' and (proveedor <> 'prueba' or v_row.proveedor = 'prueba');

  if v_row.monto <= v_max then
    update public.carteles
       set pago_id = p_pago_id, monto_neto = p_neto, estado = 'a_devolver', motivo = 'superado', updated_at = now()
     where id = p_cartel;
    return 'superado';
  end if;

  update public.carteles
     set pago_id = p_pago_id, monto_neto = p_neto, estado = 'pagado', pagado_at = now(), updated_at = now()
   where id = p_cartel;
  return 'pagado';
end;
$$;

revoke all on function public.cartel_aplicar_pago(uuid, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.cartel_aplicar_pago(uuid, text, numeric, numeric) to service_role;

-- ─── Cartel de ejemplo ──────────────────────────────────────────────────────
-- Lo pone la casa con monto 0: el primero que done el precio inicial lo saca.
insert into public.carteles (autor, objetivo_player_id, mensaje, estilo, monto, proveedor, estado, pagado_at)
select
  '10v10 STATS',
  (select id from public.players where name = 'Tiky' limit 1),
  'SE ALQUILA ESTE CARTEL 📢 Cartel ANTISECOS: si no te da para superar al anterior, ni lo mires. Tiky, andá juntando.',
  'fuego',
  0,
  'casa',
  'pagado',
  now()
where not exists (select 1 from public.carteles where proveedor = 'casa');
