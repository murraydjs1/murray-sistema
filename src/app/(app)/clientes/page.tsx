import Link from "next/link";
import { humanLabel } from "@/lib/ui/labels";
import { requireOperations } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireOperations();
  const { q } = await searchParams;
  const clients = await prisma.client.findMany({
    where: q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ] } : undefined,
    include: { _count: { select: { quotes: true, events: true } } },
    orderBy: { name: "asc" },
  });

  return <>
    <div className="topbar"><div><div className="eyebrow">Base de clientes</div><h1>Clientes</h1></div><Link className="btn btn-primary" href="/clientes/nuevo">+ Nuevo cliente</Link></div>
    <form className="toolbar" method="get">
      <div className="field toolbar-search"><label htmlFor="clients-q">Buscar</label><input id="clients-q" name="q" defaultValue={q || ""} placeholder="Nombre, email o teléfono" /></div>
      <button className="btn btn-secondary">Buscar</button>
      {q && <Link className="btn btn-ghost" href="/clientes">Limpiar</Link>}
    </form>
    <div className="table-wrap"><table className="table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Teléfono</th><th>Eventos</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td data-label="Nombre"><Link href={`/clientes/${client.id}`}>{client.name}</Link></td><td data-label="Tipo">{humanLabel(client.type)}</td><td data-label="Teléfono">{client.phone || "—"}</td><td data-label="Eventos">{client._count.events}</td></tr>)}</tbody></table></div>
    {!clients.length && <div className="card empty"><strong>{q ? "No encontramos clientes" : "Todavía no hay clientes"}</strong><p>{q ? "Probá con otro nombre, email o teléfono." : "Creá el primero para comenzar a organizar eventos y presupuestos."}</p></div>}
  </>;
}
