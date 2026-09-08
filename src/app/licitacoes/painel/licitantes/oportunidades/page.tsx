import Link from "next/link";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { BuscaOportunidades } from "./busca";

export const dynamic = "force-dynamic";

export default async function Oportunidades() {
  const { conta } = await exigirSessaoLicitacoes();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/licitacoes/painel/licitantes" className="text-sm text-slate-500 hover:underline">
          ← Empresas licitantes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Oportunidades no PNCP</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Busca ao vivo no Portal Nacional de Contratações Públicas, por modalidade, estado e palavra-chave.
          Encontrou uma que interessa? Salve com um clique — ela entra na sua lista de editais de interesse,
          pronta para montar o envelope.
        </p>
      </div>

      <BuscaOportunidades ufPadrao={conta.enderecoUf ?? ""} />
    </div>
  );
}
