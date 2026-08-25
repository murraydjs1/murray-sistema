import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalPrintActions } from "@/components/quotes/proposal-actions";
import { buildProposalWhatsappMessage } from "@/lib/quotes/proposal";
import { formatMoney } from "@/lib/money/format";
import { premium200Service } from "@/lib/catalog/premium-200";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

const included = [
  ["Presentación", "Cabina de DJ frente tipo negro."],
  ["Sonido", "Equipo JBL profesional bi-amplificado acorde a la cantidad de personas."],
  ["Iluminación de pista", "Truss de hasta 3 m, cabezales móviles LED, luces RGB, consola digital y máquina de humo."],
  ["Iluminación decorativa", "10 luces LED RGB perimetrales a un color."],
  ["Operación", "DJ del equipo Murray, operador de iluminación, armado, desarmado y fletes incluidos."],
] as const;

const premiumIncluded = [
  ["DJ del equipo Murray DJs", "Música para acompañar cada momento de la fiesta."],
  ["Sonido biamplificado", "Cobertura profesional para hasta 200 personas."],
  ["Truss aéreo de 6 metros", "Estructura colgada de la carpa para jerarquizar la pista."],
  ["4 cabezales móviles Beam 9R", "Efectos de movimiento y profundidad sobre la pista."],
  ["8 protones de iluminación", "Iluminación dinámica diseñada para la pista de baile."],
  ["4 bolas espejadas de 50 cm", "Ambientación clásica para una pista con presencia."],
] as const;

export default async function ProposalPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  await requireManagement();
  const { id, versionId } = await params;
  const [quote, catalogAddOns] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        eventType: true,
        versions: { where: { id: versionId }, include: { items: { orderBy: { sortOrder: "asc" }, include: { service: { select: { code: true } }, addOn: { select: { code: true } } } }, proposalOptions: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
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
    currency: version.currency,
  });
  const date = quote.eventDate.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const isPremium = version.items.some(item => item.service?.code === premium200Service.code || item.description === premium200Service.description);
  const packageIncluded = isPremium || version.items.some(item => item.serviceId && item.description.toLowerCase().includes("producción"));
  const includedAddOnIds = new Set(version.items.flatMap(item => item.addOnId ? [item.addOnId] : []));
  const availableCatalogAddOns = catalogAddOns.filter(addOn => !includedAddOnIds.has(addOn.id) && !version.proposalOptions.some(option => option.code === addOn.code));
  const proposalOptions = [...availableCatalogAddOns, ...version.proposalOptions.map(option => ({ ...option, name: option.code === "dj-micky-2h" ? "DJ Set Micky Murray · 2 horas" : "DJ Set Micky Murray · 4 horas" }))];

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
        <div className="eyebrow">{isPremium ? "PRODUCCIÓN PREMIUM" : "PRODUCCIÓN TÉCNICA PARA TU EVENTO"}</div>
        <h1>{isPremium ? "Producción Premium para hasta 200 personas" : `${quote.eventType.name} · Producción técnica`}</h1>
        {isPremium && <p className="proposal-hero-copy">Una pista con presencia, sonido e iluminación para hacer que la fiesta se sienta distinta.</p>}
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
        <div className="proposal-section-heading"><h2>{isPremium ? "Qué incluye tu Producción Premium" : "Alcance de la producción"}</h2><p>{isPremium ? "Esta es la producción técnica completa incluida en el valor de esta propuesta." : "Todo listo para una pista con presencia, sonido e iluminación profesional."}</p></div>
        <div className={isPremium ? "proposal-feature-grid" : "proposal-included"}>{(isPremium ? premiumIncluded : included).map(([title, description]) => <div key={title}><i /><strong>{title}</strong><span>{description}</span></div>)}</div>
      </section>}

      <section className="proposal-section">
        <div className="proposal-section-heading"><h2>Inversión</h2><p>Valores correspondientes a esta versión comercial.</p></div>
        <div className="proposal-lines">{version.items.map(item => <div key={item.id}><div><strong>{isPremium && (item.service?.code === premium200Service.code || item.description === premium200Service.description) ? "Producción Premium · hasta 200 personas" : item.description}</strong><span>{String(item.quantity)} × {formatMoney(String(item.listUnitPrice), version.currency)}</span></div><b>{formatMoney(String(item.finalAmount), version.currency)}</b></div>)}</div>
      </section>

      <section className="proposal-total-card">
        <div><span>Total de la producción</span><strong>{formatMoney(String(version.totalFinal), version.currency)}</strong>{Number(version.taxRate) > 0 && <small>Incluye {version.taxName || "IVA"} {Number(version.taxRate)}%</small>}</div>
        <div className="proposal-total-breakdown"><span>Reserva {Number(version.depositPercentage)}%</span><b>{formatMoney(String(version.depositAmount), version.currency)}</b></div>
      </section>

      <section className="proposal-terms">
        <h2>Reserva y condiciones</h2>
        <p>La reserva se formaliza con el pago de la seña. El importe restante se abona 24 h antes del evento. La propuesta tiene vigencia de 7 días.</p>
        <p><strong>Importante:</strong> los valores indicados no incluyen IVA. El importe restante se actualizará conforme a la variación del IPC.</p>
        {version.notes && <p><strong>Observaciones:</strong> {version.notes}</p>}
      </section>

      {proposalOptions.length > 0 && <section className="proposal-section proposal-options">
        <div className="proposal-options-kicker">OPCIONALES DISPONIBLES</div>
        <div className="proposal-section-heading"><h2>Potenciá tu fiesta</h2><p>Estos adicionales no están incluidos en el total de esta propuesta. Elegí los que más te gusten y te enviamos una versión actualizada.</p></div>
        <div className="proposal-option-grid">{proposalOptions.map(addOn => <div key={addOn.code}><strong>{addOn.name}</strong><span>{addOn.description}</span><b>{formatMoney(String(addOn.listPrice), addOn.currency)}</b></div>)}</div>
      </section>}

      <footer className="proposal-footer"><span>MURRAY DISC JOCKEYS</span><span>Propuesta {quote.number}</span></footer>
    </article>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
