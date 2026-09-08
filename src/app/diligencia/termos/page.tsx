import type { Metadata } from "next";
import { ContratoDaSolucao } from "@/components/contrato-da-solucao";

export const metadata: Metadata = { title: "Contrato — Due diligence de pessoas" };

// Lê do banco a cada acesso: contrato publicado na administração vale na hora.
export const dynamic = "force-dynamic";

export default function TermosDaSolucao() {
  return <ContratoDaSolucao solucao="DILIGENCIA_PESSOA" rotulo="Due diligence de pessoas" voltarPara="/diligencia/planos" />;
}
