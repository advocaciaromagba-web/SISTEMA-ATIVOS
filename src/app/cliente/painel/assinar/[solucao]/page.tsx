import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { solucao as buscarSolucao } from "@/lib/solucoes";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { planosDaSolucao } from "../planos-por-solucao";
import { FormularioAssinatura } from "./formulario";

export default async function AssinarSolucao({ params }: { params: { solucao: string } }) {
  const cliente = await exigirSessaoCliente();
  const planos = planosDaSolucao(params.solucao);
  const info = buscarSolucao(params.solucao);
  if (!planos || !info) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/cliente/painel" className="text-sm text-slate-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Assinar {info.nome}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Acesso liberado agora, com {DIAS_DE_TESTE} dias de teste grátis. A cobrança só começa quando o teste
          acabar — cancele antes disso e nada é cobrado.
        </p>
      </div>

      <FormularioAssinatura solucao={params.solucao} planos={planos} documentoJaCadastrado={Boolean(cliente.documento)} />
    </div>
  );
}
