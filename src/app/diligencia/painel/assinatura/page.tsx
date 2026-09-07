import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Due diligence de pessoas" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="DILIGENCIA_PESSOA" rotulo="Due diligence de pessoas" paginaTermos="/diligencia/termos" />;
}
