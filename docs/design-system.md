# Murray DJs design system

La fuente de verdad visual está en `src/app/globals.css`. Los componentes reutilizables viven en `src/components/ui`.

- `Button`: primary sólo para la acción principal; secondary, ghost y danger para el resto.
- `Card`, `StatCard`, `MobileCard`: superficies operativas y métricas.
- `Badge`, `StatusBadge`: estados semánticos sin depender sólo del color.
- `Input`, `Select`, `Textarea`: se usan dentro de `.field` con label visible.
- `PageHeader`, `MoneyDisplay`, `EmptyState`, `LoadingState`, `Table`: patrones de contenido.
- `Dialog`: confirmaciones accesibles con `dialog` nativo.

Los importes usan números tabulares. En mobile, las tablas existentes cambian a cards y la navegación principal pasa a una barra inferior de 44 px o más por objetivo táctil.
## Logo oficial

Colocar la versión blanca en `public/brand/murray-logo-dark.svg` y la versión negra en `public/brand/murray-logo-light.svg`. No se incluyó una recreación: hasta disponer de los originales, la app utiliza una marca tipográfica temporal con el ícono musical de la librería existente.
