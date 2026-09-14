import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import { FormularioParecer } from "../formulario";

export default async function NovoParecer() {
  const { conta } = await exigirSessaoCompliance();

  const processos = await prisma.complianceProcesso.findMany({
    where: { complianceContaId: conta.id, ativa: true },
    select: { id: true, apelido: true, numeroProcesso: true },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Novo parecer</h1>
        <p className="text-sm text-slate-500">
          O sistema gera uma minuta automaticamente ao salvar. Você revisa, ajusta o texto se precisar, e só então
          finaliza — com ou sem registro de quem assina.
        </p>
      </div>

      <FormularioParecer
        processos={processos.map((p) => ({
          id: p.id,
          rotulo: p.apelido || formatarNumeroProcessoCnj(p.numeroProcesso),
        }))}
      />
    </div>
  );
}
