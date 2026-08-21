"use client";

import { useState, useTransition } from "react";
import { Check, Copy, FileDown, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { registerProposalSent } from "@/app/actions/quotes";

export function ProposalActions({ quoteId, proposalUrl, message }: { quoteId: string; proposalUrl: string; message: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function registerShared() {
    startTransition(async () => {
      await registerProposalSent(quoteId);
      router.refresh();
    });
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    registerShared();
    window.setTimeout(() => setCopied(false), 2200);
  }

  function openProposal() {
    window.open(proposalUrl, "_blank", "noopener,noreferrer");
    registerShared();
  }

  return <div className="proposal-actions" aria-label="Acciones de propuesta">
    <button className="btn btn-secondary" onClick={copyMessage} disabled={pending}>
      {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Mensaje copiado" : "Copiar WhatsApp"}
    </button>
    <button className="btn btn-primary" onClick={openProposal} disabled={pending}>
      <FileDown size={17} />Abrir para PDF
    </button>
  </div>;
}

export function ProposalPrintActions({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <div className="proposal-actions proposal-print-actions" data-print-hide>
    <button className="btn btn-secondary" onClick={copyMessage}>
      {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Mensaje copiado" : "Copiar mensaje"}
    </button>
    <button className="btn btn-primary" onClick={() => window.print()}>
      <Printer size={17} />Imprimir o guardar PDF
    </button>
  </div>;
}
