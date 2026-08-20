# Murray DJs — Manual de diseño de producto

Este documento es la fuente de verdad visual y de experiencia para el sistema de gestión de Murray DJs. Toda pantalla, componente, formulario, tabla, menú, estado y flujo nuevo debe respetar estas reglas.

Murray es una herramienta operativa B2B para administrar eventos, presupuestos, clientes, personal y finanzas. La interfaz debe priorizar lectura rápida, carga segura, trazabilidad y confianza.

## 1. Principios no negociables

1. La interfaz se escribe en castellano rioplatense claro y profesional.
2. El rojo Murray es el color de marca. Se usa para la acción primaria, el foco y la selección; nunca como relleno decorativo masivo.
3. El producto conserva su identidad oscura: fondo negro cálido, superficies grafito y bordes sutiles.
4. La densidad es operativa: información visible, filas compactas y poco ruido.
5. No se anidan cajas si ambos niveles representan la misma información.
6. No se repite contexto entre navegación, breadcrumb y encabezados.
7. Una pantalla tiene una sola acción primaria evidente.
8. Los estados se expresan con texto humano y color semántico.
9. Todo debe soportar nombres largos, muchos registros y pantallas pequeñas.
10. Si una decisión no acelera una tarea, mejora la comprensión o reduce errores, sobra.

## 2. Personalidad

El sistema debe sentirse profesional, sobrio, preciso, compacto, moderno y preparado para uso diario. La energía de la marca aparece en el rojo, el material fotográfico y pequeños detalles; el área de trabajo permanece calma.

No debe sentirse como una landing, una plantilla de dashboards, una colección de cards gigantes ni una interfaz experimental.

## 3. Fundamentos visuales

### Paleta

| Uso | Token | Valor base |
| --- | --- | --- |
| Fondo | `--background` | `#090c0e` |
| Fondo secundario | `--background-secondary` | `#0f1417` |
| Superficie | `--surface` | `#141a1d` |
| Superficie auxiliar | `--surface-subtle` | `#111619` |
| Borde | `--border` | `#2a3338` |
| Texto principal | `--text-primary` | `#f5f7f8` |
| Texto secundario | `--text-secondary` | `#aeb7bc` |
| Marca / acción | `--brand` | `#ff3035` |
| Éxito | `--success` | verde |
| Advertencia | `--warning` | ámbar |
| Error / destructivo | `--danger` | rojo semántico |

No usar gradientes decorativos en el área operativa. Las sombras se reservan para modales, menús y overlays. Las cards normales usan un solo borde y no proyectan sombra.

### Tipografía

- Familia: Manrope, Inter y fallback del sistema.
- Cuerpo operativo: 13–14 px.
- Títulos de pantalla: 28–36 px, semibold.
- Títulos de sección: 18–20 px.
- Metadata: 11–12 px.
- No transformar etiquetas visibles a mayúsculas. Las siglas `ARS`, `USD`, `IVA`, `DJ` y `PDF` se conservan.
- Valores monetarios usan números tabulares.

### Espaciado y forma

- Escala: 4, 8, 12, 16, 24, 32 y 48 px.
- Radio de controles: 9 px.
- Radio de superficies: 12 px.
- Controles: 40–42 px de alto.
- Separación entre módulos principales: 24–32 px.
- Animaciones: 150–220 ms, `ease-out`, respetando `prefers-reduced-motion`.

## 4. Shell y navegación

El shell contiene sidebar, header con breadcrumb y contenido. No agrega un segundo header que repita la ruta.

### Sidebar

- Desktop colapsado: 76 px. Expandido al hover o foco: 284 px.
- Fondo grafito, borde derecho sutil, sin sombra.
- Filas de 42–44 px con iconos lineales.
- Navegación agrupada en Resumen, Operación, Comercial, Finanzas y Configuración.
- Estado activo con fondo rojo suave, icono rojo y texto claro.
- Avatar y salida permanecen abajo.
- En tablet se mantiene colapsado. En mobile se reemplaza por barra inferior y menú explícito.

### Header y breadcrumb

- Altura estable de 56–64 px.
- Breadcrumb humano a la izquierda; identidad del usuario a la derecha.
- Puede mantenerse sticky con transparencia y blur discretos.
- Los nombres largos se truncan, nunca rompen el layout.

### Contenido

- Ancho máximo funcional: 1680 px.
- Padding responsive de 20–44 px.
- Una única cabecera de página con título, descripción breve opcional y acción primaria.
- No repetir títulos ni categorías en mayúsculas.

## 5. Componentes

### Botones

- Primario: rojo Murray, texto blanco, una sola acción dominante.
- Secundario: transparente o grafito, borde sutil.
- Destructivo: rojo semántico y confirmación explícita.
- Ghost: navegación o acción terciaria.
- Todo botón tiene foco visible, estado disabled y etiqueta comprensible.

### Superficies y cards

Una card representa una unidad real: métrica, evento, persona, resumen o formulario. No se usa como wrapper automático. Un módulo usa un solo nivel de borde; los subgrupos se separan con espacio, títulos o líneas.

### Tablas

- Son el patrón principal para listados operativos.
- Header grafito más oscuro, texto normal, sin mayúsculas forzadas.
- Filas compactas, bordes horizontales y hover leve.
- Metadata secundaria en una segunda línea con espacio real.
- Estados humanos: `Confirmado`, `En preparación`, `Realizado`, `Cerrado`.
- En mobile se convierten en bloques etiquetados sin perder acciones.

### Formularios

- Labels siempre visibles; placeholders solo como ejemplo.
- Agrupar por tarea, no por tabla de base de datos.
- Una superficie principal por formulario.
- Errores cerca del campo y resumen superior si son varios.
- No borrar lo ingresado ante un error del servidor.

### Estados

- Loading: skeleton o estructura estable.
- Vacío: qué falta, por qué importa y qué acción sigue.
- Error: mensaje humano y recuperación posible; nunca stack traces.
- Éxito: confirmación breve sin modal bloqueante.
- Los estados no dependen solo del color.

## 6. Patrones por módulo

- Dashboard: primero estado operativo, después dinero. Métricas compactas y accionables; filtros plegables.
- Agenda: calendario legible, navegación mensual clara y lista de próximos eventos como apoyo.
- Eventos: toolbar con orden, búsqueda/filtros y `Nuevo evento`; tabla agrupada por mes sin datos concatenados.
- Clientes: listado compacto, búsqueda y acceso directo al detalle; teléfono y cantidad de eventos como metadata.
- Personal: filtros de período en una fila, obligaciones escaneables y alta en panel plegable.
- Catálogo: servicios y adicionales en dos columnas; edición progresiva sin modal innecesario.
- Gastos: separar configuración de categorías, alta de gasto e historial. Las acciones destructivas siempre piden motivo.
- Tesorería: diferenciar caja, obligaciones y rentabilidad. Valores por moneda, operaciones plegables y explicación del cálculo.
- Rentabilidad: filtros compactos, resultados definitivos separados de provisionales y moneda siempre visible.
- Usuarios: nombre e iniciales primero; email y rol como metadata. Los enums no se muestran crudos.

## 7. Contenido, formatos y seguridad

- Fechas visibles en `es-AR`; no mostrar ISO.
- Datos ausentes: `Sin dato`, `Sin asignar`, `Sin fecha` o `—` en tablas compactas.
- Roles: `Administrador`, `Administración financiera`, `Personal`.
- Nunca exponer secretos, URLs privadas, IDs técnicos ni errores internos.
- Ocultar acciones no autorizadas mejora la UX, pero toda autorización se valida en servidor.
- Crear, editar o eliminar debe actualizar la pantalla sin exigir F5 cuando sea razonable.

## 8. Responsive y accesibilidad

- Desktop prioriza densidad; tablet permite wrap; mobile usa una columna.
- No esconder acciones importantes por falta de ancho.
- Operación completa con teclado.
- Foco rojo visible y contrastante.
- Iconos decorativos con `aria-hidden`; acciones ambiguas con label o tooltip.
- Modales con `role="dialog"`, cierre con Escape y foco controlado.
- No introducir overflow horizontal accidental.

## 9. Checklist de entrega

- [ ] Breadcrumb y navegación activos correctos.
- [ ] Una sola acción primaria.
- [ ] Sin información repetida ni cards anidadas sin función.
- [ ] Estados y roles en lenguaje humano.
- [ ] Nombres largos, vacío y muchos registros probados.
- [ ] Desktop, laptop, tablet y mobile verificados.
- [ ] Teclado, foco, Escape y click afuera verificados.
- [ ] Sin secretos ni errores técnicos visibles.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` aprobados.

## 10. Regla final

Murray DJs debe parecer un sistema único: oscuro, sobrio, compacto y preciso, con el rojo como firma de marca y no como ruido. Ante la duda, elegir la opción que permita trabajar más rápido y cometer menos errores.
