# Amicro

Librería completa de [Amicro](https://github.com/Subhan-code/Amicro--Micro-transitions-) (MIT, ver `LICENSE`):
162 componentes del registry, más `hooks/` y `lib/`.

Cambios respecto del original:

- `framer-motion` → `motion/react` (la dependencia que ya usa el sitio) y `'use client'` donde hace falta.
- `hooks/use-canvas-setup.ts` viene de `src/hooks` del repo: lo usan los gráficos dither y no está en el registry.
- Arreglos de tipos para TypeScript estricto (`Variants`, `useRef`, un `style` duplicado).
- Los que se usan en el sitio aceptan `className` (con `cn`) y props de botón:
  `magnetic-button`, `glow-button`, `spotlight` (+ `as`), `tilt-card` (+ `depth`, `contentClassName`),
  `skeleton`, `text-shimmer-wave` (+ `text`), `blur-text` y `character-stagger` (en `span`, agrupando por palabra
  y con el texto para lectores de pantalla).
