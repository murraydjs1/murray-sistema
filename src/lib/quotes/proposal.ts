import { formatMoney } from "@/lib/money/format";

type ProposalMessageInput = {
  clientName: string;
  eventType: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  venue: string;
  locality?: string | null;
  guestCount?: number | null;
  total: string | number;
  depositPercentage: string | number;
  depositAmount: string | number;
  balance: string | number;
  currency: "ARS" | "USD";
};

export function buildProposalWhatsappMessage(input: ProposalMessageInput) {
  const date = input.eventDate.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const location = [input.venue, input.locality].filter(Boolean).join(" · ");
  const guests = input.guestCount ? `\nInvitados: hasta ${input.guestCount} personas` : "";

  return [
    `Hola ${input.clientName}, ¡gracias por consultar con Murray DJs!`,
    "",
    "Te compartimos la propuesta para tu evento:",
    `Fecha: ${date}`,
    `Horario: ${input.startTime} a ${input.endTime}`,
    `Lugar: ${location}${guests}`,
    "",
    `Total: ${formatMoney(input.total, input.currency)}`,
    `Reserva (${input.depositPercentage}%): ${formatMoney(input.depositAmount, input.currency)}`,
    `Saldo: ${formatMoney(input.balance, input.currency)}`,
    "",
    "La reserva se formaliza con la seña. El saldo se abona 24 h antes del evento.",
    "Los valores indicados no incluyen IVA. El saldo pendiente se actualizará conforme a la variación del IPC.",
    "La propuesta tiene vigencia de 7 días.",
    "",
    "Te enviamos el PDF con el detalle de la producción y los opcionales disponibles.",
    "",
    "MURRAY DISC JOCKEYS",
  ].join("\n");
}
