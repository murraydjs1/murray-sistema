import { describe, expect, it } from "vitest";
import { buildProposalWhatsappMessage } from "@/lib/quotes/proposal";

describe("mensaje de propuesta", () => {
  it("incluye los datos comerciales y aclara la actualización del importe restante", () => {
    const message = buildProposalWhatsappMessage({
      clientName: "Carla",
      eventType: "Cumpleaños",
      eventDate: new Date("2026-06-26T00:00:00.000Z"),
      startTime: "21:00",
      endTime: "03:00",
      venue: "SUM La Comarca",
      locality: "Pilar",
      guestCount: 100,
      total: "2000000",
      depositPercentage: "50",
      depositAmount: "1000000",
      currency: "ARS",
    });

    expect(message).toContain("Hola Carla");
    expect(message).toContain("26 de junio de 2026");
    expect(message).toContain("SUM La Comarca · Pilar");
    expect(message).toContain("Reserva (50%): $ 1.000.000");
    expect(message).not.toContain("Saldo:");
    expect(message).toContain("importe restante se actualizará conforme a la variación del IPC");
    expect(message).toContain("vigencia de 7 días");
  });
});
