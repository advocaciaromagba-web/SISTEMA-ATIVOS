import type { Metadata } from "next";
import { ContratoDaSolucao } from "@/components/contrato-da-solucao";

export const metadata: Metadata = { title: "Contrato — Verificação de documentos" };

// Lê do banco a cada acesso: contrato publicado na administração vale na hora.
export const dynamic = "force-dynamic";

export default function TermosDaSolucao() {
  return <ContratoDaSolucao solucao="VERIFICACAO_DOCUMENTOS" rotulo="Verificação de documentos" voltarPara="/verificacao/planos" />;
}
