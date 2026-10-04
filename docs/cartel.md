# El Cartel (donaciones)

Arriba de todo en la home hay un cartel. Cualquiera dona con Mercado Pago y pone lo que quiera (mensaje, foto o GIF, a
quién va dirigido y un estilo). Queda ahí hasta que otro ponga **más** plata. El historial está en `/cartel`.

## Reglas

- **Precio para sacarlo** = lo que puso el que lo tiene + `CARTEL_SUBA_MINIMA` (default $1), y nunca menos que
  `CARTEL_PRECIO_INICIAL` (default $10). El cartel de ejemplo es "de la casa" (monto 0): el primero paga $10, el
  siguiente $11, y así. Se puede poner de más: el próximo tiene que superar eso ("blindaje").
- El precio se chequea al abrir el checkout, pero lo que manda es **el momento del pago**: `cartel_aplicar_pago`
  (Postgres, de a un pago por vez) sólo le da el cartel al que supera al vigente. Si dos pagan el mismo precio, se lo
  queda el primero y al otro se le devuelve la plata sola (API de reembolsos).
- Un pago devuelto o con contracargo baja ese cartel (y el precio vuelve a lo anterior).
- **Moderación**: en `/cartel` → "Moderación", con `CARTEL_ADMIN_KEY` (o la clave del panel de la banca). Bajar un
  cartel lo oculta (vuelve el anterior) pero **no** baja el precio.

## Cómo se mueve la plata

```
donador ──Checkout Pro──▶ cuenta de Mercado Pago dueña de CARTEL_MP_ACCESS_TOKEN
                                   └── le ganaron de mano / otro monto / pagó dos veces ──▶ reembolso automático
```

- Es una cuenta aparte de la banca de las apuestas: va el token de quien recibe las donaciones.
- Los avisos llegan a `/api/cartel/webhook` (cada checkout manda su `notification_url`). Si el cartel usa la misma cuenta
  que la banca, el webhook de las apuestas ignora estos pagos (`external_reference` empieza con `cartel:`).
- Si una devolución falla (p. ej. con credenciales de prueba, que no permiten reembolsos), el cartel queda
  `a_devolver`: hay que devolverlo a mano desde Mercado Pago. Se ven con
  `select * from carteles where estado = 'a_devolver';`.

## Puesta en marcha

1. **Base**: `supabase/migrations/20261003200000_cartel.sql` (ya aplicada en el proyecto 10v10stats, con el cartel de
   ejemplo). Tablas `carteles` y `carteles_log` con RLS sin políticas: sólo el servidor las toca.
2. **Mercado Pago** (con la cuenta que va a recibir la plata): en
   [developers](https://www.mercadopago.com.ar/developers/panel/app) crear una aplicación de **Checkout Pro**, y en
   "Credenciales de producción" copiar el **Access Token** (`APP_USR-…`).
3. **Variables** en Vercel (Production) y, si querés, en `.env.local`:

   | Variable | Para qué |
   | --- | --- |
   | `CARTEL_MP_ACCESS_TOKEN` | **Obligatoria.** Sin ella no se puede donar (el cartel se ve igual). |
   | `CARTEL_MP_WEBHOOK_SECRET` | Opcional: clave secreta de Webhooks de esa aplicación, para validar la firma. |
   | `CARTEL_PRECIO_INICIAL` | Lo que sale el primer cartel (default 10). |
   | `CARTEL_SUBA_MINIMA` | Cuánto más que el anterior hay que poner (default 1). |
   | `CARTEL_MONTO_MAX` | Tope por donación (default 1.000.000). |
   | `CARTEL_ADMIN_KEY` | Clave de moderación (12+ caracteres). Si no está, sirve `APUESTAS_ADMIN_KEY`. |

   La URL pública para volver del checkout sale de `APUESTAS_SITE_URL` / `NEXT_PUBLIC_SITE_URL` /
   `VERCEL_PROJECT_PRODUCTION_URL` (igual que las apuestas). También hace falta `SUPABASE_SERVICE_ROLE_KEY`.
4. Probar con una donación real chiquita. Ojo: Mercado Pago se queda con su comisión de cada donación.

## Modo prueba (local)

Con `next dev` y **sin** `CARTEL_MP_ACCESS_TOKEN`, el pago se simula: no se cobra nada y el cartel se aplica al volver.
Como el entorno local usa la misma base que producción, esas filas quedan con `proveedor = 'prueba'`: producción no las
muestra ni las cuenta para el precio. Para limpiarlas: `delete from carteles where proveedor = 'prueba';` (y las fotos en
`tabulador/carteles/` desde Storage).

## Mapa del código

| Archivo | Qué hace |
| --- | --- |
| `lib/cartel/tipos.ts` | Tipos, límites y el cálculo del precio (compartido con el navegador). |
| `lib/cartel/config.ts` | Variables de entorno. |
| `lib/cartel/servicio.ts` | Cartel vigente, historial y rankings, abrir el checkout, aplicar pagos, devolver, moderar. |
| `lib/cartel/mercadopago.ts` | Preferencia, búsqueda de pagos y reembolsos con la cuenta del cartel. |
| `components/cartel/*` | El cartel (`cartel-billboard`), la home/vuelta del pago (`cartel-vivo`), el formulario (`cartel-composer`) y el historial. |
| `components/novedades/cartel-demo.tsx` | La demo animada del pop-up de novedades. |

### API

| Ruta | |
| --- | --- |
| `GET /api/cartel` | Cartel vigente y precio para sacarlo. |
| `POST /api/cartel` | Abrir el checkout (multipart con el mensaje, la foto, etc.). Devuelve la URL de pago. |
| `POST /api/cartel/:id` | Al volver del checkout: cómo quedó (consulta Mercado Pago si el aviso no llegó). |
| `POST /api/cartel/webhook` | Avisos de Mercado Pago. |
| `GET/POST /api/cartel/admin` | Moderación (header `x-cartel-admin`): `ocultar` / `mostrar`. |

## Límites

- Mensaje hasta 160 caracteres, firma hasta 24. Imagen JPG/PNG/WEBP/GIF de hasta 3 MB (las fotos se achican a 1200 px
  en el navegador; los GIF van tal cual). Se valida el tipo real del archivo, no lo que dice el navegador.
- Si hay más de 20 checkouts sin pagar en 10 minutos, se frena un rato. Las fotos de checkouts sin pagar se borran a las
  24 h.
