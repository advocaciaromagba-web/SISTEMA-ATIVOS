import type { Metadata } from "next";
import { ContratoDaSolucao } from "@/components/contrato-da-solucao";

export const metadata: Metadata = { title: "Contrato — Compliance de empresas" };

// Lê do banco a cada acesso: contrato publicado na administração vale na hora.
export const dynamic = "force-dynamic";

export default function TermosDaSolucao() {
  return <ContratoDaSolucao solucao="COMPLIANCE_EMPRESA" rotulo="Compliance de empresas" voltarPara="/compliance/planos" />;
}
