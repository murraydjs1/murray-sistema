"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Dash", title: "Dashboard" },
  "/eventos": { eyebrow: "Operación", title: "Eventos" },
  "/clientes": { eyebrow: "Base", title: "Clientes" },
  "/personal": { eyebrow: "Equipo", title: "Personal" },
  "/gastos": { eyebrow: "Finanzas", title: "Gastos" },
  "/tesoreria": { eyebrow: "Finanzas", title: "Tesorería" },
  "/reportes/rentabilidad": { eyebrow: "Reportes", title: "Rentabilidad" },
  "/usuarios": { eyebrow: "Admin", title: "Usuarios" },
  "/catalogo": { eyebrow: "Catálogo", title: "Catálogo" },
};

export function WorkspaceHeader({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const entry = Object.entries(labels).find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  const current = entry?.[1] ?? { eyebrow: "Murray DJs", title: "Sistema" };
  return (
    <header className="workspace-header">
      <div>
        <div className="eyebrow">{current.eyebrow}</div>
        <div className="page-title">{current.title}</div>
      </div>
      <div className="user">
        <strong>{name}</strong>
        <div className="muted user-role">{role.replace("_", " ")}</div>
      </div>
    </header>
  );
}
