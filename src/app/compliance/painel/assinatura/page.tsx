import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Compliance de empresas" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="COMPLIANCE_EMPRESA" rotulo="Compliance de empresas" paginaTermos="/compliance/termos" />;
}
