export function databaseUrlError(value: string | undefined) {
  if (!value?.trim()) return "DATABASE_URL no está configurada.";
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return "DATABASE_URL debe usar postgresql:// o postgres://.";
    if (!url.hostname) return "DATABASE_URL no incluye un host.";
    return null;
  } catch {
    return "DATABASE_URL no es una URL PostgreSQL válida.";
  }
}
