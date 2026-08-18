# Operación, base de datos, pruebas y despliegue

## Inicio local

```bash
pnpm install
pnpm db:local
pnpm prisma migrate deploy
SEED_DEMO_USERS=true SEED_DEMO_PASSWORD='<contraseña-demo-local>' pnpm db:seed
pnpm dev --hostname 127.0.0.1
```

La contraseña demo es solo desarrollo. La app abre en `http://127.0.0.1:3000`.

## Variables

Copiar `.env.example` a `.env`. Variables obligatorias: `DATABASE_URL`, `AUTH_SECRET` y `APP_URL`. Supabase es opcional; la clave service role solo puede consumirse en servidor. Nunca copiar valores reales a documentación, commits, logs del navegador ni variables `NEXT_PUBLIC_*`.

## Migraciones

```bash
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed
```

No ejecutar `migrate reset` sobre `murray_djs`. Playwright configura y resetea exclusivamente `murray_djs_e2e`.

## Suite de validación

```bash
pnpm test
DATABASE_URL='postgresql://…/murray_djs?schema=public' RUN_DB_INTEGRATION=true pnpm test:integration
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm build
```

Playwright inicia Next en puerto 3100, usa Chromium y corre Sprint 1, 2 y 3 de forma secuencial; mobile depende del flujo desktop ya preparado.

## GitHub y Vercel

Repositorio canónico: `https://github.com/murraydjs1/murray-sistema.git`.

Antes de publicar:

```bash
git status --short
git check-ignore .env .dev-postgres test-results playwright-report
git diff --cached --check
```

Hacer commit descriptivo en `main` y push a `origin`. Si Vercel está conectado al repositorio, el push dispara el despliegue. En Vercel deben configurarse `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` y, si se usan, variables Supabase. Ejecutar migraciones de producción como paso controlado antes de servir código que dependa del nuevo esquema.

## Recuperación

Si una migración falla, conservar el error, no editar la migración ya aplicada y crear una migración correctiva. Si un gasto o pago es incorrecto, usar `VOID`; nunca borrar el registro. Si un evento cerrado requiere cambios, ejecutar `REOPEN`, corregir y volver a cerrar.
