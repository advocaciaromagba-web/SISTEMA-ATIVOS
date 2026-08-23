import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { FormularioOperacao } from "../../formulario";

export const dynamic = "force-dynamic";

export default async function EditarOperacao({ params }: { params: { id: string } }) {
  const { organizacao } = await exigirSessao();

  const operacao = await prisma.operacao.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
  });

  if (!operacao) notFound();

  // Decimal do Prisma não atravessa a fronteira servidor/navegador; vira número.
  const dados = {
    ...operacao,
    valorFace: operacao.valorFace != null ? (Number(operacao.valorFace) as never) : null,
    valorNegociado: operacao.valorNegociado != null ? (Number(operacao.valorNegociado) as never) : null,
    desagioPercentual: operacao.desagioPercentual != null ? (Number(operacao.desagioPercentual) as never) : null,
    comissaoPercentual: operacao.comissaoPercentual != null ? (Number(operacao.comissaoPercentual) as never) : null,
    comissaoValor: operacao.comissaoValor != null ? (Number(operacao.comissaoValor) as never) : null,
    quantidade: operacao.quantidade != null ? (Number(operacao.quantidade) as never) : null,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/painel/operacoes/${operacao.id}`} className="text-sm text-slate-500 hover:underline">
          ← {operacao.titulo}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Editar operação</h1>
      </div>

      <FormularioOperacao operacao={dados} />
    </div>
  );
}
