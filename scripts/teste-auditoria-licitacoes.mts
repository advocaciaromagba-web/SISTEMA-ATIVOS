/**
 * Prova a auditoria de compliance da solucao de licitacoes contra o banco
 * de verdade, nos dois lados, e confirma o isolamento: nada e gravado em
 * Auditoria/Consulta (tabelas da gestao de ativos).
 *
 * Usa CNPJ real (Banco do Brasil) para a fonte responder de verdade.
 * Cria organizacao de teste e apaga tudo ao final.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/teste-auditoria-licitacoes.mts
 */
import { prisma } from "@/lib/prisma";
import { auditarLicitante, auditarParticipante } from "@/lib/licitacoes/auditoria";

const CNPJ_TESTE = "00000000000191"; // Banco do Brasil — situacao ATIVA conhecida

async function principal() {
  const org = await prisma.organizacao.create({ data: { nome: "Teste Auditoria Licitacoes", plano: "TESTE" } });
  const usuario = await prisma.usuario.create({
    data: { organizacaoId: org.id, nome: "Teste", email: `teste-${Date.now()}@exemplo.com`, passwordHash: "x" },
  });

  try {
    const antesAuditoria = await prisma.auditoria.count();
    const antesConsulta = await prisma.consulta.count();

    // ---- frente do licitante ----
    const licitante = await prisma.licitanteEmpresa.create({
      data: { organizacaoId: org.id, nome: "Banco do Brasil SA", documento: CNPJ_TESTE },
    });

    const { resultado: resultadoLicitante } = await auditarLicitante({ licitante, usuario, organizacaoId: org.id });
    console.log("=== Frente do licitante ===");
    console.log(`idoneidade: ${resultadoLicitante.idoneidade}  pontuacao: ${resultadoLicitante.pontuacao}`);
    console.log(`parecer: ${resultadoLicitante.parecer}`);

    const licitanteAtualizado = await prisma.licitanteEmpresa.findUniqueOrThrow({ where: { id: licitante.id } });
    console.log(`cache na LicitanteEmpresa: situacaoCompliance=${licitanteAtualizado.situacaoCompliance}  pontuacao=${licitanteAtualizado.pontuacao}`);
    const consultasLicitante = await prisma.licitanteConsulta.count({ where: { licitanteEmpresaId: licitante.id } });
    console.log(`LicitanteConsulta gravadas: ${consultasLicitante}`);

    // ---- frente da prefeitura ----
    const certame = await prisma.certame.create({
      data: { organizacaoId: org.id, orgaoLicitante: "Teste", modalidade: "Pregão Eletrônico", numeroCertame: "999/2026" },
    });
    const participante = await prisma.participanteCertame.create({
      data: { certameId: certame.id, nome: "Banco do Brasil SA", documento: CNPJ_TESTE },
    });

    const { resultado: resultadoParticipante } = await auditarParticipante({ participante });
    console.log("");
    console.log("=== Frente da prefeitura ===");
    console.log(`idoneidade: ${resultadoParticipante.idoneidade}  pontuacao: ${resultadoParticipante.pontuacao}`);

    const participanteAtualizado = await prisma.participanteCertame.findUniqueOrThrow({ where: { id: participante.id } });
    console.log(`cache no ParticipanteCertame: complianceIdoneidade=${participanteAtualizado.complianceIdoneidade}`);
    console.log(`situacao (decisao humana, intocada): ${participanteAtualizado.situacao}`);
    const consultasParticipante = await prisma.participanteConsulta.count({ where: { participanteCertameId: participante.id } });
    console.log(`ParticipanteConsulta gravadas: ${consultasParticipante}`);

    // ---- isolamento ----
    const depoisAuditoria = await prisma.auditoria.count();
    const depoisConsulta = await prisma.consulta.count();
    console.log("");
    console.log(`Auditoria (gestao de ativos) antes/depois: ${antesAuditoria} / ${depoisAuditoria}   ${antesAuditoria === depoisAuditoria ? "OK" : "ISOLAMENTO QUEBRADO"}`);
    console.log(`Consulta (gestao de ativos)  antes/depois: ${antesConsulta} / ${depoisConsulta}   ${antesConsulta === depoisConsulta ? "OK" : "ISOLAMENTO QUEBRADO"}`);
  } finally {
    const certames = await prisma.certame.findMany({ where: { organizacaoId: org.id }, select: { id: true } });
    const participantes = await prisma.participanteCertame.findMany({
      where: { certameId: { in: certames.map((c) => c.id) } },
      select: { id: true },
    });
    const participanteIds = participantes.map((p) => p.id);

    await prisma.participanteConsulta.deleteMany({ where: { participanteCertameId: { in: participanteIds } } });
    await prisma.participanteAuditoria.deleteMany({ where: { participanteCertameId: { in: participanteIds } } });
    await prisma.documentoParticipante.deleteMany({ where: { participanteCertameId: { in: participanteIds } } });
    await prisma.participanteCertame.deleteMany({ where: { id: { in: participanteIds } } });
    await prisma.certame.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.licitanteConsulta.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.licitanteAuditoria.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.licitanteEmpresa.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.usuario.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.organizacao.delete({ where: { id: org.id } });
    console.log("");
    console.log("Dados de teste removidos.");
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
