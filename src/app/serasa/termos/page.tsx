import type { Metadata } from "next";
import { ContratoDaSolucao } from "@/components/contrato-da-solucao";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Contrato — Consulta cadastral" };

// Lê do banco a cada acesso: contrato publicado na administração vale na hora.
export const dynamic = "force-dynamic";

export default function TermosDaSolucao() {
  return <ContratoDaSolucao solucao="CONSULTA_CADASTRAL_SERASA" rotulo="Consulta cadastral" voltarPara="/serasa/entrar" />;
}
