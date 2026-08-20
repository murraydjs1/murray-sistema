import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function Agenda({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireManagement();
  const params = await searchParams;
  const match = /^(\d{4})-(\d{2})$/.exec(params.month || "");
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  const events = await prisma.event.findMany({
    where: { eventDate: { gte: start, lte: end }, status: { not: "CANCELADO" } },
    include: { client: true, eventType: true, managerStaff: true },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });
  const firstOffset = (start.getUTCDay() + 6) % 7;
  const days = Array.from({ length: end.getUTCDate() }, (_, index) => index + 1);
  const monthKey = (offset: number) => { const date = new Date(Date.UTC(year, monthIndex + offset, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; };
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const todayIsVisible = now.getFullYear() === year && now.getMonth() === monthIndex;

  return <>
    <div className="topbar agenda-heading">
      <div><h1>Agenda</h1><p className="muted">Planificación mensual de eventos y responsables.</p></div>
      <div className="month-switcher"><Link className="btn btn-secondary icon-btn" href={`/agenda?month=${monthKey(-1)}`} aria-label="Mes anterior"><ChevronLeft size={18} /></Link><strong>{monthLabel}</strong><Link className="btn btn-secondary icon-btn" href={`/agenda?month=${monthKey(1)}`} aria-label="Mes siguiente"><ChevronRight size={18} /></Link></div>
    </div>
    <div className="agenda-summary" aria-label="Resumen del mes"><span><strong>{events.length}</strong> eventos</span><span><strong>{events.filter((event) => event.status === "CONFIRMADO").length}</strong> confirmados</span><span className={events.some((event) => !event.managerStaffId) ? "summary-warning" : ""}><strong>{events.filter((event) => !event.managerStaffId).length}</strong> sin encargado</span></div>
    <section className="agenda-layout">
      <div className="calendar">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div className="cal-head" key={day}>{day}</div>)}{Array.from({ length: firstOffset }, (_, index) => <div className="cal-day cal-day-empty" key={`empty-${index}`} />)}{days.map((day) => {
        const todaysEvents = events.filter((event) => event.eventDate.getUTCDate() === day);
        const isToday = todayIsVisible && now.getDate() === day;
        return <div className={`cal-day${isToday ? " cal-day-today" : ""}`} key={day}><span className="cal-num">{day}</span>{todaysEvents.map((event) => <Link className="cal-event" href={`/eventos/${event.id}`} key={event.id}><strong>{event.startTime} · {event.client.name}</strong><span>{event.eventType.name}</span></Link>)}</div>;
      })}</div>
      <aside className="panel-section agenda-side"><div className="panel-heading"><div><h2>Eventos del mes</h2><p>Ordenados por fecha y horario.</p></div></div><div className="agenda-event-list">{events.map((event) => <Link href={`/eventos/${event.id}`} key={event.id}><time><strong>{event.eventDate.toLocaleDateString("es-AR", { day: "2-digit", timeZone: "UTC" })}</strong><span>{event.eventDate.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", "")}</span></time><div><strong>{event.client.name}</strong><span>{event.startTime} · {event.venue}</span></div><small>{event.managerStaff?.name || "Sin encargado"}</small><ChevronRight size={15} /></Link>)}{!events.length && <div className="empty-inline">No hay eventos cargados para este mes.</div>}</div></aside>
    </section>
  </>;
}
