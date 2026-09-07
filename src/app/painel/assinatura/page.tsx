import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Gestão de ativos" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="GESTAO_ATIVOS" rotulo="Gestão de ativos" paginaTermos="/termos" />;
}
