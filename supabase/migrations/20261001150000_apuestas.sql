-- ============================================================================
-- Apuestas entre amigos (pozo por equipos y duelos 1v1)
--
-- * `apuestas_jugadores`: quién puede apostar. Cada uno entra con un PIN
--   (se guarda sólo el hash) y deja su alias/CVU para cobrar premios.
-- * `apuestas_eventos`: una partida armada en el generador con los equipos
--   congelados y las chances del modelo en ese momento.
-- * `apuestas`: lo que se juega en un evento. Cada evento tiene un pozo por
--   equipos (parimutuel) y cualquier cantidad de duelos 1v1.
-- * `apuestas_posiciones`: la plata que pone cada uno (una fila por pago).
--   Guarda el estado del pago en Mercado Pago y, al liquidar, lo que cobra.
-- * `apuestas_log`: auditoría de todo lo que mueve plata (webhooks, reembolsos,
--   premios pagados, acciones del admin).
--
-- Todo se lee y escribe desde el servidor con la service role: las tablas
-- tienen RLS sin políticas, así el cliente con la anon key no ve nada.
-- ============================================================================

create table if not exists public.apuestas_jugadores (
  player_id uuid primary key references public.players (id) on delete cascade,
  -- scrypt$<salt>$<hash>: el PIN nunca se guarda en claro.
  pin_hash text not null,
  -- Alias o CVU de Mercado Pago donde cobra los premios.
  alias_cobro text,
  habilitado boolean not null default true,
  intentos_fallidos smallint not null default 0,
  bloqueado_hasta timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apuestas_eventos (
  id uuid primary key default gen_random_uuid(),
  creado_por uuid references public.players (id) on delete set null,
  mapa text,
  equipo_a_nombre text not null default 'Equipo 1',
  equipo_b_nombre text not null default 'Equipo 2',
  equipo_a uuid[] not null,
  equipo_b uuid[] not null,
  -- Chance de que gane el equipo A según el generador al abrir las apuestas.
  prob_a numeric(5, 4) not null check (prob_a > 0 and prob_a < 1),
  -- Foto de las cuotas: { duelos: { "<id menor>|<id mayor>": prob del id menor }, fuente, pesoFaceit }.
  cuotas jsonb not null default '{}'::jsonb,
  estado text not null default 'abierto'
    check (estado in ('abierto', 'en_juego', 'resuelto', 'cancelado')),
  -- Hasta cuándo se puede entrar y pagar. Después se cierra solo.
  cierra_at timestamptz not null,
  match_id uuid references public.matches (id) on delete set null,
  ganador text check (ganador in ('A', 'B', 'empate')),
  created_at timestamptz not null default now(),
  cerrado_at timestamptz,
  resuelto_at timestamptz,
  constraint apuestas_eventos_equipos_check check (
    cardinality(equipo_a) between 1 and 10 and cardinality(equipo_b) between 1 and 10
  )
);

create index if not exists apuestas_eventos_estado_idx
  on public.apuestas_eventos (estado, created_at desc);

create table if not exists public.apuestas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.apuestas_eventos (id) on delete cascade,
  tipo text not null check (tipo in ('pozo', 'duelo')),
  -- equipo: gana el que gana la partida · rendimiento: gana el que tiene mejor partida (KDA + daño).
  mercado text not null default 'equipo' check (mercado in ('equipo', 'rendimiento')),
  -- Duelos: quién desafía a quién, de qué lado está el retador y cuánto pone cada uno.
  retador_id uuid references public.players (id) on delete set null,
  rival_id uuid references public.players (id) on delete set null,
  lado_retador text check (lado_retador in ('A', 'B')),
  monto_retador integer check (monto_retador > 0),
  monto_rival integer check (monto_rival > 0),
  -- Chance del retador (duelo) o del equipo A (pozo) cuando se creó.
  prob numeric(5, 4),
  -- Pozo: entrada mínima.
  monto_minimo integer check (monto_minimo > 0),
  -- propuesta: el rival todavía no aceptó · abierta: se está juntando la plata
  -- confirmada: hay plata de los dos lados, falta el resultado · liquidada: ya se sabe quién cobra
  -- anulada: no se jugó (ver motivo); lo pagado se devuelve.
  estado text not null default 'abierta'
    check (estado in ('propuesta', 'abierta', 'confirmada', 'liquidada', 'anulada')),
  motivo text,
  -- Lado ganador, o 'nula' si se devuelve todo (empate, no jugaron, etc.).
  resultado text check (resultado in ('A', 'B', 'nula')),
  mensaje text check (char_length(mensaje) <= 140),
  created_at timestamptz not null default now(),
  liquidada_at timestamptz,
  constraint apuestas_duelo_check check (
    tipo <> 'duelo' or (
      retador_id is not null and rival_id is not null and retador_id <> rival_id
      and lado_retador is not null and monto_retador is not null and monto_rival is not null
    )
  )
);

-- Un solo pozo por evento.
create unique index if not exists apuestas_un_pozo_por_evento_idx
  on public.apuestas (evento_id) where tipo = 'pozo';

create index if not exists apuestas_evento_idx on public.apuestas (evento_id);

create table if not exists public.apuestas_posiciones (
  id uuid primary key default gen_random_uuid(),
  apuesta_id uuid not null references public.apuestas (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  lado text not null check (lado in ('A', 'B')),
  -- Lo que se juega (pesos enteros) y la comisión de Mercado Pago que paga encima.
  monto integer not null check (monto > 0),
  recargo numeric(10, 2) not null default 0 check (recargo >= 0),
  -- pendiente: falta pagar · en_proceso: avisó que transfirió (modo manual)
  -- pagada · anulada: nunca se pagó y ya no corre · reembolsada: se le devolvió
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_proceso', 'pagada', 'anulada', 'reembolsada')),
  proveedor text check (proveedor in ('mercadopago', 'manual')),
  checkout_id text,
  checkout_url text,
  pago_id text unique,
  -- Lo que efectivamente acreditó Mercado Pago (después de su comisión).
  monto_neto numeric(12, 2),
  pagada_at timestamptz,
  reembolso_id text,
  reembolsada_at timestamptz,
  -- Liquidación: gana / pierde / devuelve y cuánto cobra (incluye lo que puso).
  resultado text check (resultado in ('gana', 'pierde', 'devuelve')),
  premio numeric(12, 2) check (premio >= 0),
  premio_estado text check (premio_estado in ('pendiente', 'pagado')),
  premio_ref text,
  premio_pagado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists apuestas_posiciones_apuesta_idx on public.apuestas_posiciones (apuesta_id);
create index if not exists apuestas_posiciones_player_idx on public.apuestas_posiciones (player_id, created_at desc);
create index if not exists apuestas_posiciones_premio_idx
  on public.apuestas_posiciones (premio_estado) where premio_estado = 'pendiente';

create table if not exists public.apuestas_log (
  id bigint generated always as identity primary key,
  tipo text not null,
  evento_id uuid references public.apuestas_eventos (id) on delete set null,
  apuesta_id uuid references public.apuestas (id) on delete set null,
  posicion_id uuid references public.apuestas_posiciones (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists apuestas_log_created_idx on public.apuestas_log (created_at desc);

-- ─── Liquidación atómica ────────────────────────────────────────────────────
-- Pasa la apuesta de 'confirmada' a 'liquidada' y escribe el resultado de cada
-- posición en una sola transacción. Devuelve false si otro proceso ya la
-- liquidó (así un webhook repetido o dos clicks no pagan dos veces).
create or replace function public.apuestas_liquidar(p_apuesta uuid, p_resultado text, p_items jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.apuestas
     set estado = 'liquidada', resultado = p_resultado, liquidada_at = now()
   where id = p_apuesta and estado = 'confirmada';

  if not found then
    return false;
  end if;

  update public.apuestas_posiciones as p
     set resultado = i.resultado,
         premio = i.premio,
         premio_estado = case when i.premio > 0 then 'pendiente' else null end,
         updated_at = now()
    from jsonb_to_recordset(p_items) as i (id uuid, resultado text, premio numeric)
   where p.id = i.id and p.apuesta_id = p_apuesta;

  return true;
end
$$;

revoke all on function public.apuestas_liquidar(uuid, text, jsonb) from public, anon, authenticated;

-- ─── Seguridad ──────────────────────────────────────────────────────────────
-- RLS prendido y sin políticas: sólo la service role (el servidor) entra.
alter table public.apuestas_jugadores enable row level security;
alter table public.apuestas_eventos enable row level security;
alter table public.apuestas enable row level security;
alter table public.apuestas_posiciones enable row level security;
alter table public.apuestas_log enable row level security;
