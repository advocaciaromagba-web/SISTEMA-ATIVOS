import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { FormularioLicitante } from "../../formulario";

export const dynamic = "force-dynamic";

export default async function EditarLicitante({ params }: { params: { id: string } }) {
  const { conta } = await exigirSessaoLicitacoes();

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: params.id, licitacaoContaId: conta.id },
  });
  if (!licitante) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Editar {licitante.nome}</h1>
      </div>

      <FormularioLicitante licitante={licitante} />
    </div>
  );
}
