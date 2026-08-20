"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const labels: Record<string, { section: string; title: string }> = {
  "/dashboard": { section: "Resumen", title: "Inicio" },
  "/agenda": { section: "Operación", title: "Agenda" },
  "/eventos": { section: "Operación", title: "Eventos" },
  "/clientes": { section: "Comercial", title: "Clientes" },
  "/presupuestos": { section: "Comercial", title: "Presupuestos" },
  "/personal": { section: "Equipo", title: "Personal" },
  "/catalogo": { section: "Comercial", title: "Catálogo" },
  "/gastos": { section: "Finanzas", title: "Gastos" },
  "/tesoreria": { section: "Finanzas", title: "Tesorería" },
  "/reportes/rentabilidad": { section: "Reportes", title: "Rentabilidad" },
  "/configuracion/importar-excel": { section: "Configuración", title: "Importar Excel" },
  "/usuarios": { section: "Configuración", title: "Usuarios" },
  "/staff": { section: "Operación", title: "Mis eventos" },
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  ADMIN_FINANCIERO: "Administración financiera",
  STAFF: "Personal",
};

export function WorkspaceHeader({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const entry = Object.entries(labels).find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  const current = entry?.[1] ?? { section: "Murray DJs", title: "Sistema" };
  return (
    <header className="workspace-header">
      <nav className="breadcrumb" aria-label="Ruta actual">
        <Link href="/dashboard" aria-label="Inicio"><Home size={16} aria-hidden /></Link>
        <ChevronRight size={14} aria-hidden />
        <span>{current.section}</span>
        <ChevronRight size={14} aria-hidden />
        <strong>{current.title}</strong>
      </nav>
      <div className="workspace-user">
        <span className="avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{name}</strong>
          <small>{roleLabels[role] ?? role}</small>
        </div>
      </div>
    </header>
  );
}
