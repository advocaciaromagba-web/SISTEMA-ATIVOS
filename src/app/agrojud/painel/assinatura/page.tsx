import type { Metadata } from "next";
import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";

export const metadata: Metadata = { title: "Assinatura — Agrojud" };

export const dynamic = "force-dynamic";

export default function AssinaturaDaSolucao() {
  return <PainelAssinatura solucao="AGROJUD" rotulo="Agrojud" paginaTermos="/agrojud/termos" />;
}
