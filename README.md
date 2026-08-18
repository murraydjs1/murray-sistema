# Murray DJs — Sprints 1 a 3

Aplicación web full-stack para operación comercial, eventos, personal, pagos, gastos directos y rentabilidad económica por evento.

## Requisitos

- Node.js 20 o superior
- pnpm
- PostgreSQL 15 o superior, o Docker

En macOS sin Docker, el proyecto incluye una distribución PostgreSQL real y portable para desarrollo.

## Inicio local

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm prisma migrate deploy
pnpm db:seed
pnpm bootstrap:admin miguel@murraydjs.com 'una-contraseña-segura' Miguel
pnpm dev
```

Abrir `http://localhost:3000`. El bootstrap se bloquea cuando ya existe un usuario.

### PostgreSQL local sin Docker

En una terminal:

```bash
pnpm db:local
```

En otra terminal:

```bash
export DATABASE_URL='postgresql://murray:murray_dev_only@127.0.0.1:5432/murray_djs?schema=public'
export AUTH_SECRET='reemplazar-por-un-secreto-local-de-32-caracteres'
pnpm prisma migrate deploy
SEED_DEMO_USERS=true SEED_DEMO_PASSWORD='MurraySprint1-DEV!' pnpm db:seed
pnpm dev --hostname 127.0.0.1
```

Los datos se conservan en `.dev-postgres/data`, excluido de Git.

Para cargar los seis usuarios demo en una base exclusivamente local:

```bash
SEED_DEMO_USERS=true SEED_DEMO_PASSWORD='MurraySprint1-DEV!' pnpm db:seed
```

`MurraySprint1-DEV!` está claramente reservado para desarrollo. Nunca habilitar usuarios demo ni reutilizar esa contraseña en producción.

## Verificación

```bash
pnpm test
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm build
```

Los E2E completos usan PostgreSQL real y requieren la migración y el seed de desarrollo aplicados.

## Reglas implementadas

- Importes `Decimal(18,2)`; cálculo con redondeo `HALF_UP`.
- Descuentos manuales por ítem y generales, porcentuales o fijos.
- IVA calculado sobre la base total después de descuentos.
- Seña configurable, 50% por defecto, calculada sobre el total con IVA.
- Una moneda por versión y sin conversión ARS/USD.
- Versiones inmutables con snapshot de precios y tasa fiscal.
- Confirmación manual, transaccional e idempotente; un presupuesto produce como máximo un evento.
- Fechas civiles de evento como `DATE` y horarios como `HH:mm`; timestamps técnicos en UTC.
- Auditoría append-only para operaciones sensibles del Sprint 1.
- Personal y obligaciones históricas por `EventStaff.agreedAmount`, separadas de pagos.
- Gastos directos anulables, categorías configurables y vínculo opcional con ítems comerciales.
- Rentabilidad sin IVA, por moneda y sin conversiones implícitas.
- Cierre/reapertura financiera explícita y reportes definitivos separados de provisorios.

## Documentación

- `AGENTS.md`: reglas obligatorias de implementación y entrega.
- `DESIGN.md`: identidad visual, tokens, componentes y responsive.
- `docs/ARCHITECTURE.md`: modelo técnico y fuentes de verdad.
- `docs/OPERATIONS.md`: base, pruebas, GitHub y despliegue.
