# Arquitectura funcional y técnica

## Capas

- `src/app/(app)`: páginas protegidas y composición server-side.
- `src/app/actions`: mutaciones, validación, autorización, transacciones y revalidación.
- `src/lib`: dominio puro para cálculos y fechas; no depende de sesión ni UI.
- `src/server`: Prisma, sesión, autorización, auditoría y secuencias.
- `src/components`: formularios client-side y design system.
- `prisma`: esquema, migraciones append-only y seed idempotente.
- `tests`: unidad, integración PostgreSQL y Playwright.

## Fuente de verdad comercial

`QuoteVersion` es un snapshot inmutable. `Event.sourceQuoteVersionId` señala exactamente la versión confirmada. Para rentabilidad, `taxableBase` es venta neta y `taxAmount` se informa por separado.

## Fuente de verdad de costos

`EventStaff.agreedAmount` representa la obligación económica por evento. `StaffPayment` representa movimientos pagados y no altera el costo histórico.

`EventExpense` representa gastos directos. Puede vincularse opcionalmente con `QuoteItem`; la relación siempre es manual. `VOID` conserva historia y se excluye del cálculo.

## Cálculo de rentabilidad

El servicio puro `src/lib/profitability/event-profitability.ts` produce dos buckets independientes: ARS y USD. La venta aparece únicamente en la moneda de la versión; personal y gastos se agregan por su propia moneda.

```text
result[currency] = netSale[currency] - staffCost[currency] - directExpenses[currency]
margin[currency] = result[currency] / netSale[currency] × 100
```

Si `netSale[currency]` es cero, el margen es `null`; nunca se inventa un porcentaje sobre costos en otra moneda.

## Cierre financiero

`Event.status` es operativo. `Event.financialStatus` es económico. Para cerrar, el evento debe estar `REALIZADO` o `CERRADO`. `CLOSE` registra actor y fecha. Mientras está cerrado, las acciones de gastos y asignaciones rechazan cambios en backend. `REOPEN` es explícito, auditado y devuelve el evento a resultados provisorios.

## Autorización

Las rutas de gestión llaman `requireManagement()`. Las acciones repiten la autorización. STAFF usa `/staff`, con consultas restringidas por `user.staff.id`; las rutas financieras redirigen a `/sin-acceso`.

## Auditoría y transacciones

La mutación y el audit log ocurren en una misma transacción Prisma. El audit log es append-only. Los snapshots serializan Decimal como string y fechas en ISO.

## Persistencia y entornos

- Desarrollo: `murray_djs` en PostgreSQL local/embedded.
- E2E: `murray_djs_e2e`, recreada por Playwright.
- Producción: PostgreSQL externo configurado mediante `DATABASE_URL`.

`.env` nunca se versiona. Supabase está preparado mediante variables, pero Sprint 3 no reemplaza Prisma/PostgreSQL ni implementa almacenamiento de comprobantes; solo conserva `receiptUrl` opcional.
