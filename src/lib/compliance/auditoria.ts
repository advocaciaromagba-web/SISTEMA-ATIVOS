/**
 * Compliance de Empresas — orquestração e gravação próprias desta solução.
 *
 * A verificação em si vem de `src/lib/auditoria/motor-empresa.ts`, a mesma
 * usada por Licitações: é lógica de consultar fontes externas, não dado de
 * outra solução. O que é próprio daqui é gravar em `ComplianceAuditoria` /
 * `ComplianceConsulta`, tabelas que só esta solução usa.
 */
import type { ComplianceEmpresa, ComplianceUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avaliarComplianceEmpresa } from "@/lib/auditoria/motor-empresa";
import type { ResultadoAuditoria } from "@/lib/auditoria/tipos";

export async function auditarEmpresaCompliance(params: {
  empresa: ComplianceEmpresa;
  usuario: ComplianceUsuario;
  complianceContaId: string;
}): Promise<{ auditoriaId: string; resultado: ResultadoAuditoria }> {
  const { empresa, usuario, complianceContaId } = params;

  const auditoria = await prisma.complianceAuditoria.create({
    data: {
      complianceContaId,
      complianceEmpresaId: empresa.id,
      situacao: "EM_ANDAMENTO",
      solicitadoPorId: usuario.id,
    },
  });

  const { resultado, fontes } = await avaliarComplianceEmpresa({
    documento: empresa.documento,
    nome: empresa.nome,
  });

  await prisma.complianceConsulta.createMany({
    data: fontes.map((f) => ({
      complianceEmpresaId: empresa.id,
      complianceAuditoriaId: auditoria.id,
      fonte: f.fonte,
      parametro: empresa.documento || empresa.nome,
      status: f.status === "CONCLUIDA" ? "CONCLUIDA" : "ERRO",
      resultado: (f.resultado ?? undefined) as never,
      resumo: f.resumo,
      erro: f.erro ?? null,
      concluidaEm: new Date(),
    })),
  });

  await prisma.complianceAuditoria.update({
    where: { id: auditoria.id },
    data: {
      situacao: "CONCLUIDA",
      idoneidade: resultado.idoneidade,
      capacidade: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      parecer: resultado.parecer,
      apontamentos: resultado.apontamentos as never,
      dadosCadastrais: (resultado.dadosCadastrais ?? undefined) as never,
      fontesIndisponiveis: resultado.fontesIndisponiveis as never,
      concluidaEm: new Date(),
    },
  });

  // Diferente da gestão de ativos: aqui não há operação de terceiro em risco
  // ainda no momento do cadastro — bloquear travaria a própria empresa de
  // ver o próprio resultado. `bloqueada` fica como sinal de revisão, não trava.
  await prisma.complianceEmpresa.update({
    where: { id: empresa.id },
    data: {
      situacaoCompliance: resultado.idoneidade,
      capacidadePagamento: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      complianceEm: new Date(),
      bloqueada: resultado.idoneidade === "RESTRICAO",
    },
  });

  return { auditoriaId: auditoria.id, resultado };
}
