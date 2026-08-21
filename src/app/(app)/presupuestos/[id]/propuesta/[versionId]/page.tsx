import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalPrintActions } from "@/components/quotes/proposal-actions";
import { buildProposalWhatsappMessage } from "@/lib/quotes/proposal";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

const included = [
  ["Presentación", "Cabina de DJ frente tipo negro."],
  ["Sonido", "Equipo JBL profesional bi-amplificado acorde a la cantidad de personas."],
  ["Iluminación de pista", "Truss de hasta 3 m, cabezales móviles LED, luces RGB, consola digital y máquina de humo."],
  ["Iluminación decorativa", "10 luces LED RGB perimetrales a un color."],
  ["Operación", "DJ del equipo Murray, operador de iluminación, armado, desarmado y fletes incluidos."],
] as const;

export default async function ProposalPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  await requireManagement();
  const { id, versionId } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      eventType: true,
      versions: { where: { id: versionId }, include: { items: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  const version = quote?.versions[0];
  if (!quote || !version) notFound();

  const message = buildProposalWhatsappMessage({
    clientName: quote.client.name,
    eventType: quote.eventType.name,
    eventDate: quote.eventDate,
    startTime: quote.startTime,
    endTime: quote.endTime,
    venue: quote.venue,
    locality: quote.locality,
    guestCount: quote.guestCount,
    total: String(version.totalFinal),
    depositPercentage: String(version.depositPercentage),
    depositAmount: String(version.depositAmount),
    balance: String(version.balance),
    currency: version.currency,
  });
  const date = quote.eventDate.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const packageIncluded = version.items.some(item => item.serviceId && item.description.toLowerCase().includes("producción"));

  return <div className="proposal-document">
    <div className="proposal-toolbar" data-print-hide>
      <Link className="btn btn-secondary" href={`/presupuestos/${quote.id}`}>Volver al presupuesto</Link>
      <ProposalPrintActions message={message} />
    </div>

    <article className="proposal-sheet">
      <header className="proposal-branding">
        <Image src="/brand/murray-logo-dark.svg" width={176} height={70} alt="Murray Disc Jockeys" priority />
        <div><span>PROPUESTA</span><i /></div>
      </header>

      <section className="proposal-hero">
        <div className="eyebrow">PRODUCCIÓN PARA FIESTAS DE 50</div>
        <h1>{quote.eventType.name} · Producción técnica</h1>
        <span className="proposal-number">{quote.number} · Versión {version.versionNumber}</span>
      </section>

      <section className="proposal-info-grid">
        <Info label="Cliente" value={quote.client.name} />
        <Info label="Fecha" value={date} />
        <Info label="Horario" value={`${quote.startTime} a ${quote.endTime}`} />
        <Info label="Invitados" value={quote.guestCount ? `Hasta ${quote.guestCount} personas` : "A confirmar"} />
        <Info label="Lugar" value={quote.venue} />
        <Info label="Localidad" value={quote.locality || quote.address || "A confirmar"} />
      </section>

      {packageIncluded && <section className="proposal-section">
        <div className="proposal-section-heading"><h2>Alcance de la producción</h2><p>Todo listo para una pista con presencia, sonido e iluminación profesional.</p></div>
        <div className="proposal-included">{included.map(([title, description]) => <div key={title}><i /><strong>{title}</strong><span>{description}</span></div>)}</div>
      </section>}

      <section className="proposal-section">
        <div className="proposal-section-heading"><h2>Detalle de la propuesta</h2><p>Valores correspondientes a esta versión comercial.</p></div>
        <div className="proposal-lines">{version.items.map(item => <div key={item.id}><div><strong>{item.description}</strong><span>{String(item.quantity)} × {formatMoney(String(item.listUnitPrice), version.currency)}</span></div><b>{formatMoney(String(item.finalAmount), version.currency)}</b></div>)}</div>
      </section>

      <section className="proposal-total-card">
        <div><span>Total de la producción</span><strong>{formatMoney(String(version.totalFinal), version.currency)}</strong>{Number(version.taxRate) > 0 && <small>Incluye {version.taxName || "IVA"} {Number(version.taxRate)}%</small>}</div>
        <div className="proposal-total-breakdown"><span>Reserva {Number(version.depositPercentage)}%</span><b>{formatMoney(String(version.depositAmount), version.currency)}</b><span>Saldo</span><b>{formatMoney(String(version.balance), version.currency)}</b></div>
      </section>

      <section className="proposal-terms">
        <h2>Reserva y condiciones</h2>
        <p>La reserva se formaliza con el pago de la seña. El saldo se abona 24 h antes del evento. La propuesta tiene vigencia de 7 días.</p>
        {version.notes && <p><strong>Observaciones:</strong> {version.notes}</p>}
      </section>

      <footer className="proposal-footer"><span>MURRAY DISC JOCKEYS</span><span>Propuesta {quote.number}</span></footer>
    </article>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
