# Apuestas entre amigos

Pozo por equipos y duelos 1v1 sobre las partidas armadas en el generador, con plata real vía Mercado Pago.
Todo está construido y apagado: se prende con variables de entorno (ver **Puesta en marcha**).

## Qué se puede apostar

| Apuesta | Quién | Cómo paga |
| --- | --- | --- |
| **Pozo por equipos** | Cualquiera con PIN. Los que juegan sólo pueden ir con **su** equipo. | Parimutuel: los que le pegan se reparten todo, en proporción a lo que puso cada uno. La cuota sale de cuánta plata hay de cada lado. |
| **Duelo · gana la partida** | Dos que juegan en equipos rivales. | El que está en el equipo ganador se lleva lo que pusieron los dos. |
| **Duelo · mejor partida** | Dos que juegan (pueden ser compañeros). | Gana el de mejor puntaje `(K + A) / D + daño / 100` (el mismo que elige al MVP). |

En los duelos se elige cuánto pone cada uno: **lo mismo**, **lo justo según chances** (el favorito pone más) u **otro monto**.
El rival tiene que aceptar antes de que se pague nada.

### Cuotas

- **Cuota justa** = 1 / chance del generador. Con 60% de chance paga ×1,67.
- **Monto justo del rival** = mi monto × (1 − p) / p. Si tengo 65%, contra mis $1.000 el rival pone $540.
- **Cuota del pozo** = total del pozo / lo puesto en ese equipo.
- Las chances salen del generador al momento de abrir las apuestas (FACEIT + 10v10 + forma; para "mejor partida", el
  modelo mezclado con el historial real entre los dos) y quedan congeladas en el evento.

Todo eso vive en `lib/apuestas/cuotas.ts` (funciones puras, compartidas entre servidor y navegador).

## Cómo se mueve la plata

```
jugador ──Checkout Pro──▶ cuenta de MP de la banca ──(se carga la partida)──▶ ganadores
                                   │                                         (transferencia manual al alias)
                                   └── anulada / empate / pagó tarde ──▶ reembolso automático por API
```

- La **banca** es la cuenta de Mercado Pago dueña del `MERCADOPAGO_ACCESS_TOKEN`. Toda la plata entra ahí.
- **Reembolsos**: automáticos con la API de devoluciones (vuelven al medio con el que se pagó).
- **Premios**: la API pública de Mercado Pago no permite mandarle plata a otra cuenta, así que el admin los transfiere a
  mano al alias de cada ganador y los marca como pagados en el panel de la banca. Si algún día tienen acceso a la API de
  "Money Out", se enchufa en `devolver()` / `marcarPremioPagado()` de `lib/apuestas`.
- **Comisión de Mercado Pago**: con `APUESTAS_RECARGO_PCT` cada apostador la paga encima (cobra `monto / (1 − pct)`), así
  el pozo queda redondo. Con 0 la absorbe la banca. Lo que acreditó MP de verdad queda en `monto_neto`.

## Ciclo de vida

**Evento** (una partida con apuestas): `abierto` → `en_juego` (cierre manual o vence el plazo) → `resuelto`, o `cancelado`.

**Duelo**: `propuesta` → (acepta) `abierta` → (pagan los dos) `confirmada` → `liquidada`.
**Pozo**: `abierta` → (cierre con plata de los dos lados) `confirmada` → `liquidada`.
Cualquiera puede terminar `anulada` (rechazo, vencimiento, cancelación, sin contraparte): lo pagado se devuelve.

**Posición** (la plata de cada uno): `pendiente` → `pagada` → (`gana` / `pierde` / `devuelve`). También `en_proceso`
(modo manual, avisó que transfirió), `anulada` (nunca pagó) y `reembolsada`.

### Reglas

- Al cerrar: los duelos no aceptados o sin los dos pagos se anulan; el pozo sigue sólo si hay plata pagada de los dos lados.
- Al cargar una partida (`POST /api/matches`) con **exactamente** los mismos 10 de un evento de las últimas 24 h, se
  liquida sola. Si cambió alguien, el admin la liquida eligiendo la partida en el panel.
- Empate, uno de los del duelo no jugó, mismo puntaje, o los equipos se rearmaron (menos de la mitad de un lado quedó
  junto): la apuesta es nula y se devuelve.
- Un pago que llega tarde, por otro monto o repetido se devuelve solo.
- Cada transición es un `update … where estado = <anterior>`: dos clicks o un webhook repetido no pagan dos veces. La
  liquidación es atómica (`apuestas_liquidar` en Postgres).

## Identidad

No hay cuentas: el admin le arma un **PIN** (4 a 8 números) a cada jugador desde el panel de la banca. Se guarda sólo el
hash (scrypt). Al entrar queda una cookie httpOnly firmada con `APUESTAS_SESSION_SECRET` por 30 días. 5 PINs mal puestos
bloquean al jugador 15 minutos. Cada uno carga su alias/CVU de cobro.

## Puesta en marcha

1. **Base**: `supabase/migrations/20261001150000_apuestas.sql` (ya aplicada en el proyecto 10v10stats de Supabase).
   Crea las tablas con RLS y sin políticas: sólo el servidor (service role) las toca.
2. **Variables** (en Vercel y en `.env.local`; ver `.env.example`):

   | Variable | Para qué |
   | --- | --- |
   | `APUESTAS_HABILITADAS` | `true` las prende. `preview` muestra las cuotas en el generador sin poder apostar. |
   | `APUESTAS_SESSION_SECRET` | 32+ caracteres al azar. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `APUESTAS_ADMIN_KEY` | Clave del panel de la banca (12+ caracteres). |
   | `MERCADOPAGO_ACCESS_TOKEN` | Access token de la aplicación (primero el de prueba). |
   | `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta del webhook, para validar la firma. |
   | `APUESTAS_SITE_URL` | URL pública. En Vercel se deduce de `VERCEL_PROJECT_PRODUCTION_URL`. |
   | `APUESTAS_MONTO_MIN` / `APUESTAS_MONTO_MAX` | Límites por apuesta (default 500 / 50.000). |
   | `APUESTAS_RECARGO_PCT` | Comisión de MP a cargo del apostador, en %. |
   | `MERCADOPAGO_USE_SANDBOX` | `true` para usar el `sandbox_init_point` con credenciales de prueba. |
   | `APUESTAS_BANCA_ALIAS` | Sólo modo manual (sin Mercado Pago). |

3. **Mercado Pago** ([developers](https://www.mercadopago.com.ar/developers/panel/app)):
   1. Crear una aplicación de tipo **Checkout Pro** / pagos online.
   2. Crear usuarios de prueba (un vendedor y un comprador) y usar las credenciales de prueba del vendedor.
   3. En la aplicación → **Webhooks**: URL `https://<tu-sitio>/api/apuestas/webhook`, evento **Pagos**. Copiar la clave
      secreta a `MERCADOPAGO_WEBHOOK_SECRET`. (Cada checkout también manda `notification_url` a la misma ruta.)
   4. Probar todo el circuito con el comprador de prueba. Después pasar a las credenciales de producción.
   5. En local el webhook no llega (localhost): al volver del checkout la página consulta el pago sola (`verificar`).
4. **Banca**: entrar a `/apuestas` → "Panel de la banca" con `APUESTAS_ADMIN_KEY` y armar el PIN de cada uno.
5. Sumar la novedad en `lib/novedades.ts` cuando se prenda para todos.

### Modo manual (sin Mercado Pago)

Sin `MERCADOPAGO_ACCESS_TOKEN` y con `APUESTAS_BANCA_ALIAS`: cada uno transfiere a ese alias y toca "Ya transferí"; el
admin confirma en el panel cuando ve la plata (tiene que ser antes del cierre). Premios y devoluciones, a mano.

## Mapa del código

| Archivo | Qué hace |
| --- | --- |
| `lib/apuestas/config.ts` | Variables de entorno y qué falta para prenderlas. |
| `lib/apuestas/cuotas.ts` | Matemática de cuotas, montos justos, pozo, recargo y formato. |
| `lib/apuestas/liquidacion.ts` | Quién ganó cada apuesta con la partida real y cuánto cobra cada uno (puro). |
| `lib/apuestas/servicio.ts` | Eventos, pozo, duelos, pagos, cierres, anulaciones y liquidación. |
| `lib/apuestas/mercadopago.ts` | Checkout Pro, consulta de pagos, reembolsos y firma del webhook. |
| `lib/apuestas/sesion.ts` / `cuentas.ts` | PINs, cookie de sesión y alias de cobro. |
| `lib/apuestas/admin.ts` | Panel de la banca: deudas, transferencias, jugadores. |
| `components/TeamGenerator/BetPanel.tsx` | Cuotas en el generador y "Abrir apuestas". |
| `components/apuestas/*` | Página de cada partida, pozo, duelos, pagos, hub y panel de la banca. |

### API

| Ruta | |
| --- | --- |
| `GET /api/apuestas` | Config, sesión, eventos y ranking. |
| `GET/POST/PATCH/DELETE /api/apuestas/sesion` | Quién soy · entrar con PIN · alias de cobro · salir. |
| `POST /api/apuestas/eventos` | Abrir apuestas con los equipos del generador. |
| `GET/POST /api/apuestas/eventos/:id` | Detalle · `pozo`, `desafiar`, `cerrar`, `cancelar`. |
| `POST /api/apuestas/duelos/:id` | `aceptar`, `rechazar`, `cancelar`. |
| `POST /api/apuestas/posiciones/:id` | `pagar`, `verificar`, `transferi`. |
| `POST /api/apuestas/webhook` | Avisos de Mercado Pago. |
| `GET/POST /api/apuestas/admin` | Panel de la banca (header `x-apuestas-admin`): `pin`, `premio_pagado`, `transferencia`, `resolver`, `anular`. |

Todo lo que mueve plata queda en la tabla `apuestas_log`.

## A tener en cuenta

- Mercado Pago puede revisar o limitar cuentas que reciben muchos cobros de este tipo: conviene montos chicos y usar una
  cuenta que no sea la del laburo.
- La banca tiene la plata en custodia hasta que se liquida (el panel muestra cuánto). Nadie más ve los alias de cobro.

## Ideas para después

- Avisos por WhatsApp/Telegram cuando te desafían o cuando cobrás (hoy hay un botón para mandar el desafío a mano).
- Límite por jugador por noche.
- Ranking de apostadores por temporada y badge para el que más levantó.
- Apuestas a stats (más kills de la partida, MVP) usando el mismo `ResultadoPartida`.
