"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, CalendarDays, Contact, FileText, Headphones, Landmark, LayoutDashboard,
  LogOut, Menu, PackagePlus, ReceiptText, Upload, UserRoundCog, Users,
} from "lucide-react";

type Role = "ADMIN" | "ADMIN_FINANCIERO" | "STAFF";
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Resumen", items: [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
  ] },
  { label: "Operación", items: [
    { href: "/eventos", label: "Eventos", icon: CalendarDays },
    { href: "/personal", label: "Personal", icon: UserRoundCog },
  ] },
  { label: "Comercial", items: [
    { href: "/clientes", label: "Clientes", icon: Contact },
    { href: "/presupuestos", label: "Presupuestos", icon: FileText },
    { href: "/catalogo", label: "Catálogo", icon: PackagePlus },
  ] },
  { label: "Finanzas", items: [
    { href: "/gastos", label: "Gastos", icon: ReceiptText },
    { href: "/tesoreria", label: "Tesorería", icon: Landmark },
    { href: "/reportes/rentabilidad", label: "Rentabilidad", icon: BarChart3 },
  ] },
  { label: "Configuración", items: [
    { href: "/configuracion/importar-excel", label: "Importar Excel", icon: Upload },
  ] },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function NavLink({ item, compact = false }: { item: NavItem; compact?: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const selected = isActive(pathname, item.href);
  return (
    <Link href={item.href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined} title={item.label}>
      <Icon size={compact ? 21 : 19} strokeWidth={1.8} aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppNavigation({ role, name, logoutAction }: { role: Role; name: string; logoutAction: () => Promise<void> }) {
  const staff = role === "STAFF";
  const visibleGroups = staff
    ? [{ label: "Operación", items: [{ href: "/staff", label: "Mis eventos", icon: CalendarDays }] }]
    : groups.map((group) => group.label === "Configuración" && role === "ADMIN"
      ? { ...group, items: [...group.items, { href: "/usuarios", label: "Usuarios", icon: Users }] }
      : group);
  const allItems = visibleGroups.flatMap((group) => group.items);
  const primary = staff ? allItems : allItems.filter((item) => ["/dashboard", "/agenda", "/eventos", "/clientes"].includes(item.href));
  const more = staff ? [] : allItems.filter((item) => !primary.some((primaryItem) => primaryItem.href === item.href));

  return <>
    <aside className="sidebar" aria-label="Navegación lateral">
      <Link href={staff ? "/staff" : "/dashboard"} className="brand" aria-label="Murray DJs — inicio">
        <span className="brand-compact" aria-hidden><Headphones size={24} strokeWidth={1.8} /></span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-full" src="/brand/murray-logo-dark.svg" alt="Murray Disc Jockeys" width={168} height={96} />
      </Link>
      <nav className="nav" aria-label="Navegación principal">
        {visibleGroups.map((group) => <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => <NavLink item={item} key={item.href} />)}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-account">
          <div className="sidebar-user">
            <span>{name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{name}</strong><small>{role === "ADMIN" ? "Administrador" : role === "ADMIN_FINANCIERO" ? "Administración" : "Personal"}</small></div>
          </div>
          <form action={logoutAction}><button className="btn btn-ghost sidebar-logout" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18} aria-hidden /></button></form>
        </div>
      </div>
    </aside>
    <nav className={`mobilebar ${staff ? "staff-mobilebar" : ""}`} aria-label="Navegación móvil">
      {primary.map((item) => <NavLink item={item} key={item.href} compact />)}
      {!staff && <details className="mobile-more"><summary aria-label="Más secciones"><Menu size={21} aria-hidden /><span>Más</span></summary><div className="mobile-more-menu"><div className="mobile-more-title">Más secciones</div>{more.map((item) => <NavLink item={item} key={item.href} />)}<form action={logoutAction}><button className="mobile-menu-action"><LogOut size={19} aria-hidden />Salir</button></form></div></details>}
    </nav>
  </>;
}
