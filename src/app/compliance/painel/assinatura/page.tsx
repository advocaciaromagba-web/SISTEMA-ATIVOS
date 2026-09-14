import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Compliance e Due Diligence" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="COMPLIANCE_EMPRESA" rotulo="Compliance e Due Diligence" paginaTermos="/compliance/termos" />;
}
