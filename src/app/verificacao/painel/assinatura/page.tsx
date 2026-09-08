import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Verificação de documentos" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="VERIFICACAO_DOCUMENTOS" rotulo="Verificação de documentos" paginaTermos="/verificacao/termos" />;
}
