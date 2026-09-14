/**
 * Análise processual de precatório — orquestração e gravação próprias desta
 * terceira tela da solução Compliance e Due Diligence, adicionada em
 * 14/09/2026.
 *
 * A leitura em si vem de `src/lib/auditoria/processo.ts`
 * (`analisarRegularidadePrecatorio`), que consulta o DataJud (CNJ) e manda a
 * movimentação para a IA responder especificamente sobre regularidade
 * processual. O que é próprio daqui é gravar em `ComplianceProcesso` /
 * `ComplianceProcessoAnalise`, tabelas que só esta tela usa — mesmo padrão de
 * `auditoria.ts` (empresas) e `auditoria-pessoa.ts` (pessoas), na mesma conta.
 */
import type { ComplianceProcesso, ComplianceUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analisarRegularidadePrecatorio, type RegularidadeProcesso } from "@/lib/auditoria/processo";

export async function analisarProcessoCompliance(params: {
  processo: ComplianceProcesso;
  usuario: ComplianceUsuario;
  complianceContaId: string;
}): Promise<{ analiseId: string; leitura: RegularidadeProcesso | null; erro: string | null }> {
  const { processo, usuario, complianceContaId } = params;

  const analise = await prisma.complianceProcessoAnalise.create({
    data: {
      complianceContaId,
      complianceProcessoId: processo.id,
      situacao: "EM_ANDAMENTO",
      solicitadoPorId: usuario.id,
    },
  });

  const { consulta, leitura, erroIa } = await analisarRegularidadePrecatorio(processo.numeroProcesso);

  const erro = !leitura
    ? erroIa ?? (consulta.status !== "CONCLUIDA" ? consulta.resumo : "Processo não localizado na base do CNJ.")
    : null;

  await prisma.complianceProcessoAnalise.update({
    where: { id: analise.id },
    data: {
      situacao: leitura ? "CONCLUIDA" : "ERRO",
      situacaoRegularidade: leitura?.situacao ?? null,
      faseAtual: leitura?.fase ?? null,
      transitoEmJulgado: leitura?.transitoEmJulgado.situacao ?? null,
      homologacaoCalculo: leitura?.homologacaoCalculo.situacao ?? null,
      parecer: leitura?.parecer ?? null,
      leitura: (leitura ?? undefined) as never,
      fonteResultado: (consulta.resultado ?? undefined) as never,
      erro,
      concluidaEm: new Date(),
    },
  });

  await prisma.complianceProcesso.update({
    where: { id: processo.id },
    data: {
      situacaoRegularidade: leitura?.situacao ?? null,
      faseAtual: leitura?.fase ?? null,
      transitoEmJulgado: leitura?.transitoEmJulgado.situacao ?? null,
      homologacaoCalculo: leitura?.homologacaoCalculo.situacao ?? null,
      parecer: leitura?.parecer ?? null,
      analisadoEm: new Date(),
    },
  });

  return { analiseId: analise.id, leitura, erro };
}
