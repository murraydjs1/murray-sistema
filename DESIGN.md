# Murray DJs — Design System

## Dirección visual

La interfaz es una herramienta interna nocturna, premium y sobria. La prioridad es: claridad, velocidad, mobile, marca y estética. La proporción visual objetivo es 80–90% negro/gris/blanco y 10–20% acento rojo.

No usar estética SaaS azul, gradientes decorativos, emojis como iconos, sombras intensas, fondos rojos dominantes ni colores arbitrarios por módulo.

## Tokens

La fuente ejecutable está en `src/app/globals.css`:

| Token | Valor | Uso |
|---|---:|---|
| `--background` | `#090d0f` | fondo principal |
| `--background-secondary` | `#101416` | sidebar e inputs |
| `--surface` | `#151a1d` | cards y paneles |
| `--surface-hover` | `#1b2125` | interacción |
| `--border` | `#292f33` | bordes de controles |
| `--border-soft` | `rgba(255,255,255,.08)` | divisores y cards |
| `--text-primary` | `#f7f7f7` | contenido principal |
| `--text-secondary` | `#a7adb1` | labels y apoyo |
| `--text-muted` | `#70777c` | metadata |
| `--brand` | `#ff2b2b` | CTA, foco y selección |
| `--brand-hover` | `#e62424` | hover de CTA |
| `--brand-soft` | `rgba(255,43,43,.12)` | navegación activa |
| `--success` | `#2fb171` | realizado/cerrado positivo |
| `--warning` | `#d7a53a` | pendiente/provisorio |
| `--danger` | `#ef5a5a` | error o acción destructiva |

Espaciado: 4, 8, 12, 16, 24, 32 y 48 px. Radios: controles 10 px; cards y dialogs 16 px. Transiciones funcionales: 170 ms, desactivadas con `prefers-reduced-motion`.

## Tipografía y números

Familia: Inter con fallback al stack del sistema. Los importes, métricas y totales deben usar números tabulares. H1 usa tamaño fluido de 28–42 px; H2 20 px; labels 11–13 px. No usar mayúsculas extensas salvo eyebrows, badges y estados.

## Layout

Desktop: sidebar fija de 248 px y contenido con máximo 1600 px. Mobile (<900 px): sidebar oculta y barra inferior con Inicio, Agenda, Presupuestos, Clientes y Más. Cada destino táctil tiene al menos 44 px.

En 390 px:

- grids pasan a una columna;
- tablas pasan a cards;
- formularios usan controles de ancho completo;
- resumen financiero y gastos no generan scroll horizontal;
- diálogos respetan 28 px de margen total.

## Componentes

- `Button`: `primary` para la acción principal, `secondary` para alternativas, `ghost` para baja jerarquía y `danger` para anular/desactivar.
- `Card`: superficie base; `card-interactive` solo si toda la card navega.
- `Badge`/`StatusBadge`: estado mediante texto, color y contexto; nunca solo color.
- `Input`, `Select`, `Textarea`: siempre dentro de `.field` y con label visible.
- `PageHeader`: eyebrow, título, descripción y acción principal.
- `StatCard`/`.metric`: label discreto y cifra dominante.
- `MoneyDisplay`: moneda explícita y números tabulares.
- `Dialog`: confirmación de acciones críticas; debe cerrarse al enviar y evitar doble submit.
- `EmptyState`: título útil, explicación breve y CTA si existe una acción natural.
- `ExpenseForm`: accesos frecuentes seleccionan categoría, nunca crean un gasto automáticamente.

## Estados financieros

- `OPEN`: badge ámbar; costos editables; resultados provisorios.
- `CLOSED`: badge verde/neutral positivo; costos bloqueados; resultado definitivo.
- `VOID`: baja opacidad, texto explícito y motivo visible; nunca se oculta como si no hubiese existido.

Importes positivos no usan automáticamente el rojo de marca. Resultado positivo puede usar detalle verde, pendiente ámbar y error/anulación danger.

## Pantallas Sprint 3

Ficha de evento: información operativa primero, equipo después y finanzas debajo. El resumen muestra venta neta, personal, gastos, resultado y margen. Monedas ajenas a la venta se muestran en una alerta separada y no generan margen consolidado.

Gastos: formulario de carga rápida, categorías frecuentes, descripción, importe, moneda, fecha, pagador, medio e ítem comercial opcional. Edición y anulación quedan dentro de cada card.

Rentabilidad: filtros de mes/año/moneda/orden; resumen definitivo; eventos cerrados; sección provisoria; agrupaciones por tipo, invitados, categoría y adicionales. En móvil cada evento es una card vertical.

## Accesibilidad

Contraste mínimo WCAG AA, `:focus-visible` rojo de 2 px, labels asociados, botones con nombre accesible, dialogs cerrables, estados con texto y soporte para reducción de movimiento. Cualquier nueva pantalla debe probarse con teclado y 390 px.

## Assets de marca

Los logos oficiales viven en `public/brand/`:

- `murray-logo-dark.svg`: versión blanca sobre fondo oscuro, uso principal en login, sidebar y superficies dark.
- `murray-logo-light.svg`: versión negra sobre fondo claro, reservada para piezas o exportaciones claras.
- `murray-favicon.svg`: auriculares rojos del logo sobre negro, uso en favicon/app icon.

No recrear el logo como texto o ícono genérico. Mantener la proporción del wordmark; para favicon usar solo el símbolo simple porque el wordmark completo pierde legibilidad en tamaños chicos.
