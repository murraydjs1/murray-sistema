# AGENTS.md — reglas de trabajo para Murray DJs

Este archivo es obligatorio para cualquier agente o colaborador que modifique el repositorio. Su alcance es todo el proyecto.

## Objetivo y límites actuales

La aplicación cubre Sprint 1 a Sprint 3:

- clientes, contactos, catálogo y presupuestos versionados;
- confirmación idempotente de presupuesto y creación de eventos;
- personal, asignaciones, obligaciones y pagos;
- gastos directos, cierre financiero y rentabilidad económica por evento.

No implementar sin una especificación posterior: caja global, saldos bancarios, conciliación, retiros, inversiones, inventario, PartyExpress, amortización de equipos ni participación societaria.

## Stack que debe conservarse

- Next.js App Router, React y TypeScript estricto.
- PostgreSQL como única base definitiva.
- Prisma para esquema, migraciones y acceso.
- Server Actions para mutaciones y autorización en servidor.
- Decimal.js y columnas `Decimal(18,2)` para dinero.
- Vitest para unidad/integración y Playwright con PostgreSQL real para E2E.
- Design system oscuro definido en `DESIGN.md` y `src/app/globals.css`.

No introducir SQLite, floats monetarios, un segundo ORM ni una API paralela sin una razón aprobada.

## Reglas financieras invariantes

1. Orden comercial: bruto − descuentos por ítem − descuento general = base imponible; IVA = base imponible × tasa; total = base + IVA.
2. Rentabilidad: venta neta − costo de personal − gastos directos activos = resultado.
3. Venta neta es `QuoteVersion.taxableBase`; nunca incluye `taxAmount`.
4. Costo de personal es la suma de `EventStaff.agreedAmount` activo; no depende de `StaffPayment`.
5. Un `EventExpense` con estado `VOID` no afecta resultados y nunca se elimina físicamente.
6. ARS y USD se calculan, muestran y reportan por separado. No convertir ni consolidar sin cotización explícita futura.
7. Usar Decimal y `ROUND_HALF_UP`. No convertir a `number` durante cálculos de dominio.
8. Una versión confirmada es el snapshot comercial. No recalcular históricos con precios actuales.
9. Un evento con finanzas `CLOSED` no admite cambios en gastos ni importes acordados; primero debe ejecutarse `REOPEN` explícito.
10. Solo eventos `financialStatus=CLOSED` integran resultados definitivos. Los realizados abiertos son provisorios.

## Seguridad y permisos

- Toda página financiera y toda mutación debe ejecutar `requireManagement()` en backend.
- `ADMIN` y `ADMIN_FINANCIERO` pueden gestionar gastos, asignaciones, cierres y reportes.
- Solo `ADMIN` administra usuarios.
- `STAFF` ve únicamente eventos propios y nunca recibe precios, agreed amounts, pagos, gastos, venta, resultado ni margen.
- Ocultar navegación no es autorización. Probar siempre URL directa y acción backend.
- No registrar secretos, contraseñas, tokens ni contenido de `.env`.
- `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente server-side; nunca usar prefijo `NEXT_PUBLIC_`.

## Persistencia y migraciones

- Crear una migración nueva por cambio de esquema. No editar migraciones históricas aplicadas.
- Las migraciones deben funcionar con `pnpm prisma migrate deploy` sobre datos existentes.
- Los seeds deben ser idempotentes mediante `upsert` o claves únicas estables.
- No usar `count + 1` para numeración; conservar las secuencias transaccionales existentes.
- Antes de borrar o resetear, confirmar que el destino sea exclusivamente `murray_djs_e2e`. No resetear `murray_djs`.
- Fechas de evento son civiles (`DATE` y strings `HH:mm`); timestamps técnicos permanecen UTC.

## Auditoría

Toda mutación económica relevante debe usar `audit()` dentro de la misma transacción. Registrar actor, acción, entidad, id, valores previos/nuevos y `operationId`.

Acciones mínimas vigentes:

- `EventExpense`: `CREATE`, `UPDATE`, `VOID`.
- `EventFinancial`: `CLOSE`, `REOPEN`.
- `EventStaff`: `ASSIGN`, `UPDATE_ASSIGNMENT`, `REMOVE`.
- `StaffPayment`: `CREATE`, `VOID`.

## UX y accesibilidad

- Mobile-first; validar 390 px y 1440 px.
- Objetivos táctiles de al menos 44 px, labels reales, foco visible y navegación por teclado.
- Evitar tablas horizontales en móvil; usar cards/listas.
- Un único CTA primario rojo por contexto; no usar rojo para todos los estados.
- No introducir colores hardcodeados si existe un token.
- STAFF nunca debe recibir datos financieros en el árbol renderizado.

## Flujo obligatorio de una entrega

1. Inspeccionar esquema, acciones, permisos, auditoría y tests relacionados.
2. Implementar el cambio mínimo sin duplicar lógica.
3. Ejecutar `pnpm prisma validate` y `pnpm prisma generate` si cambia Prisma.
4. Aplicar `pnpm prisma migrate deploy` sobre PostgreSQL de desarrollo.
5. Ejecutar seed idempotente si corresponde.
6. Ejecutar `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` y `pnpm build`.
7. Revisar que `.env`, `.dev-postgres`, reportes y artefactos no estén versionados.
8. Crear un commit descriptivo y hacer push a `main`. El repositorio conectado debe disparar el deploy de Vercel.
9. Informar resultados exactos, migraciones, bugs corregidos y pendientes reales.

## Definición de terminado

No declarar una tarea terminada con tests omitidos o fallidos. Si una dependencia externa impide una prueba, documentar el bloqueo exacto y no afirmar que está validada.
