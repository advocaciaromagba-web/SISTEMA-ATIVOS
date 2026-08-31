/**
 * Due Diligence de Pessoas — orquestração e gravação próprias desta solução.
 *
 * A verificação em si vem de `src/lib/auditoria/motor-pessoa.ts` — lógica de
 * consultar fontes externas, não dado de outra solução. O que é próprio
 * daqui é gravar em `DiligenciaAuditoria` / `DiligenciaConsulta`, tabelas
 * que só esta solução usa.
 */
import type { DiligenciaPessoa, DiligenciaUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avaliarDiligenciaPessoa } from "@/lib/auditoria/motor-pessoa";
import type { ResultadoAuditoria } from "@/lib/auditoria/tipos";

export async function auditarPessoaDiligencia(params: {
  pessoa: DiligenciaPessoa;
  usuario: DiligenciaUsuario;
  diligenciaContaId: string;
}): Promise<{ auditoriaId: string; resultado: ResultadoAuditoria }> {
  const { pessoa, usuario, diligenciaContaId } = params;

  const auditoria = await prisma.diligenciaAuditoria.create({
    data: {
      diligenciaContaId,
      diligenciaPessoaId: pessoa.id,
      situacao: "EM_ANDAMENTO",
      solicitadoPorId: usuario.id,
    },
  });

  const { resultado, fontes } = await avaliarDiligenciaPessoa({
    documento: pessoa.documento,
    nome: pessoa.nome,
    nomeMae: pessoa.nomeMae,
    dataNascimento: pessoa.dataNascimento,
    uf: pessoa.uf,
  });

  await prisma.diligenciaConsulta.createMany({
    data: fontes.map((f) => ({
      diligenciaPessoaId: pessoa.id,
      diligenciaAuditoriaId: auditoria.id,
      fonte: f.fonte,
      parametro: pessoa.documento || pessoa.nome,
      status: f.status === "CONCLUIDA" ? "CONCLUIDA" : "ERRO",
      resultado: (f.resultado ?? undefined) as never,
      resumo: f.resumo,
      erro: f.erro ?? null,
      concluidaEm: new Date(),
    })),
  });

  await prisma.diligenciaAuditoria.update({
    where: { id: auditoria.id },
    data: {
      situacao: "CONCLUIDA",
      idoneidade: resultado.idoneidade,
      capacidade: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      parecer: resultado.parecer,
      apontamentos: resultado.apontamentos as never,
      fontesIndisponiveis: resultado.fontesIndisponiveis as never,
      concluidaEm: new Date(),
    },
  });

  // Mesmo raciocínio de Compliance: não há operação de terceiro em risco no
  // momento do cadastro — bloquear travaria a própria pessoa de ver o
  // próprio resultado. `bloqueada` é sinal de revisão, e passa pela mesma
  // confirmação manual das outras soluções antes de sair do bloqueio.
  await prisma.diligenciaPessoa.update({
    where: { id: pessoa.id },
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
